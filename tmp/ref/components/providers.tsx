'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { ThemeProvider, BaseStyles } from '@primer/react'
import { StyledComponentsRegistry } from './styled-components-registry'

type Mode = 'light' | 'dark'

interface ColorModeContextValue {
  mode: Mode
  toggle: () => void
  setMode: (mode: Mode) => void
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null)

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext)
  if (!ctx) throw new Error('useColorMode must be used within Providers')
  return ctx
}

/**
 * App-wide Primer providers with a controllable color mode. The `data-color-mode`
 * attribute on <html> (set initially in layout) and the `colorMode` on
 * ThemeProvider are kept in sync so tokens and styled-components always agree.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('dark')

  const applyMode = useCallback((next: Mode) => {
    setModeState(next)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-color-mode', next)
    }
  }, [])

  useEffect(() => {
    applyMode(mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = useCallback(
    () => applyMode(mode === 'dark' ? 'light' : 'dark'),
    [mode, applyMode],
  )

  return (
    <StyledComponentsRegistry>
      <ColorModeContext.Provider value={{ mode, toggle, setMode: applyMode }}>
        <ThemeProvider
          colorMode={mode === 'dark' ? 'night' : 'day'}
          dayScheme="light"
          nightScheme="dark"
          preventSSRMismatch
        >
          <BaseStyles>{children}</BaseStyles>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </StyledComponentsRegistry>
  )
}
