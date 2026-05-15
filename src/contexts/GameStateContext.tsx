import React, { createContext, useContext, useState, ReactNode } from "react";
import { GameState } from "../types";

type GameStateContextValue = [GameState | null, React.Dispatch<React.SetStateAction<GameState | null>>];

const GameStateContext = createContext<GameStateContextValue | undefined>(undefined);

interface GameStateProviderProps {
  children: ReactNode;
}

export function GameStateProvider({ children }: GameStateProviderProps) {
  const [state, setState] = useState<GameState | null>(null);

  return (
    <GameStateContext.Provider value={[state, setState]}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState(): GameStateContextValue {
  const ctx = useContext(GameStateContext);
  if (ctx === undefined) {
    throw new Error("useGameState must be used within a GameStateProvider");
  }
  return ctx;
}
