import React from "react";
import { useApp } from "@/context/AppContext";
import { LoginScreen } from "@/components/LoginScreen";
import { MainScreen } from "@/components/MainScreen";

export default function AppEntry() {
  const { usuarioLogado } = useApp();

  if (!usuarioLogado) {
    return <LoginScreen />;
  }

  return <MainScreen />;
}
