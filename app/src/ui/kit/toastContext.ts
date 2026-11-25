import { createContext, useContext } from "react";

export interface ToastOptions {
  /** Adds an Undo button; clicking it runs this and closes the toast. */
  undo?: () => void;
}

export interface ToastApi {
  /** Shows a message at the bottom of the screen. A new toast replaces the one showing. */
  show: (message: string, options?: ToastOptions) => void;
}

export const ToastContext = createContext<ToastApi>({ show: () => {} });

export const useToast = () => useContext(ToastContext);
