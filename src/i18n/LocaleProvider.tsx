"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
const LocaleContext = createContext<Locale>("zh-CN");
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) { return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>; }
export function useLocale() { return useContext(LocaleContext); }
