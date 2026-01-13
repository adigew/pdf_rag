"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  useEffect,
} from "react";
import { useLocalStorage } from "usehooks-ts";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";

interface PDF {
  pdf_id: string;
  name: string;
  doc_count: number;
  page_count: number;
}

interface PDFSelectionContextType {
  selectedPdfIds: string[];
  togglePdf: (pdfId: string) => void;
  selectPdf: (pdfId: string) => void;
  deselectPdf: (pdfId: string) => void;
  selectAll: (pdfIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (pdfId: string) => boolean;
}

const PDFSelectionContext = createContext<PDFSelectionContextType | undefined>(
  undefined
);

export function PDFSelectionProvider({
  children,
  chatId,
}: {
  children: ReactNode;
  chatId?: string;
}) {
  const [selectedPdfIds, setSelectedPdfIds] = useLocalStorage<string[]>(
    `selected-pdf-ids-${chatId || "global"}`,
    []
  );

  // Sync with backend if chatId is provided
  const { data: remotePdfIds, mutate: mutateRemote } = useSWR(
    chatId ? `/api/pdfs?chatId=${chatId}` : null,
    fetcher,
    {
      onSuccess: (data) => {
        if (data?.pdfIds) {
          setSelectedPdfIds(data.pdfIds);
        }
      },
    }
  );

  const syncSelectedPdfs = useCallback(
    async (pdfIds: string[]) => {
      if (chatId) {
        try {
          await fetch(`/api/pdfs?chatId=${chatId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdfIds }),
          });
          mutateRemote({ pdfIds });
        } catch (error) {
          console.error("Failed to sync PDFs with backend", error);
        }
      }
    },
    [chatId, mutateRemote]
  );

  const togglePdf = useCallback(
    (pdfId: string) => {
      const newSelected = selectedPdfIds.includes(pdfId)
        ? selectedPdfIds.filter((id) => id !== pdfId)
        : [...selectedPdfIds, pdfId];
      setSelectedPdfIds(newSelected);
      syncSelectedPdfs(newSelected);
    },
    [selectedPdfIds, setSelectedPdfIds, syncSelectedPdfs]
  );

  const selectPdf = useCallback(
    (pdfId: string) => {
      if (!selectedPdfIds.includes(pdfId)) {
        const newSelected = [...selectedPdfIds, pdfId];
        setSelectedPdfIds(newSelected);
        syncSelectedPdfs(newSelected);
      }
    },
    [selectedPdfIds, setSelectedPdfIds, syncSelectedPdfs]
  );

  const deselectPdf = useCallback(
    (pdfId: string) => {
      if (selectedPdfIds.includes(pdfId)) {
        const newSelected = selectedPdfIds.filter((id) => id !== pdfId);
        setSelectedPdfIds(newSelected);
        syncSelectedPdfs(newSelected);
      }
    },
    [selectedPdfIds, setSelectedPdfIds, syncSelectedPdfs]
  );

  const selectAll = useCallback(
    (pdfIds: string[]) => {
      setSelectedPdfIds(pdfIds);
      syncSelectedPdfs(pdfIds);
    },
    [setSelectedPdfIds, syncSelectedPdfs]
  );

  const clearSelection = useCallback(() => {
    setSelectedPdfIds([]);
    syncSelectedPdfs([]);
  }, [setSelectedPdfIds, syncSelectedPdfs]);

  const isSelected = useCallback(
    (pdfId: string) => selectedPdfIds.includes(pdfId),
    [selectedPdfIds]
  );

  // When chatId changes, reset selection from backend
  useEffect(() => {
    if (chatId) {
      mutateRemote();
    } else {
      // If no chat, clear selection
      setSelectedPdfIds([]);
    }
  }, [chatId, mutateRemote, setSelectedPdfIds]);

  return (
    <PDFSelectionContext.Provider
      value={{
        selectedPdfIds,
        togglePdf,
        selectPdf,
        deselectPdf,
        selectAll,
        clearSelection,
        isSelected,
      }}
    >
      {children}
    </PDFSelectionContext.Provider>
  );
}

export function usePDFSelection() {
  const context = useContext(PDFSelectionContext);
  if (context === undefined) {
    throw new Error(
      "usePDFSelection must be used within a PDFSelectionProvider"
    );
  }
  return context;
}
