import { StrictMode } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { NeonAuthUIProvider } from '@neondatabase/auth-ui'
import App from './App.tsx'
import './index.css'
import { LanguageProvider } from './contexts/LanguageContext.tsx'
import { useLanguage } from './contexts/LanguageContext.tsx'
import { authClient } from './lib/auth'

const authLocalization = {
  en: {
    SIGN_IN: 'Sign in', SIGN_IN_DESCRIPTION: 'Enter your account details to continue.',
    EMAIL: 'Email', EMAIL_PLACEHOLDER: 'you@example.com', PASSWORD: 'Password', PASSWORD_PLACEHOLDER: 'Password',
    FORGOT_PASSWORD_LINK: 'Forgot your password?', SIGN_IN_ACTION: 'Sign in', OR_CONTINUE_WITH: 'Or continue with',
    SIGN_IN_WITH: 'Sign in with', DONT_HAVE_AN_ACCOUNT: "Don't have an account?", SIGN_UP: 'Create account',
  },
  pt: {
    SIGN_IN: 'Entrar', SIGN_IN_DESCRIPTION: 'Informe os dados da sua conta para continuar.',
    EMAIL: 'E-mail', EMAIL_PLACEHOLDER: 'voce@exemplo.com', PASSWORD: 'Senha', PASSWORD_PLACEHOLDER: 'Senha',
    FORGOT_PASSWORD_LINK: 'Esqueceu a senha?', SIGN_IN_ACTION: 'Entrar', OR_CONTINUE_WITH: 'Ou continue com',
    SIGN_IN_WITH: 'Entrar com', DONT_HAVE_AN_ACCOUNT: 'Ainda não tem uma conta?', SIGN_UP: 'Criar conta',
  },
  es: {
    SIGN_IN: 'Iniciar sesión', SIGN_IN_DESCRIPTION: 'Ingresa los datos de tu cuenta para continuar.',
    EMAIL: 'Correo electrónico', EMAIL_PLACEHOLDER: 'tu@ejemplo.com', PASSWORD: 'Contraseña', PASSWORD_PLACEHOLDER: 'Contraseña',
    FORGOT_PASSWORD_LINK: '¿Olvidaste tu contraseña?', SIGN_IN_ACTION: 'Iniciar sesión', OR_CONTINUE_WITH: 'O continúa con',
    SIGN_IN_WITH: 'Iniciar sesión con', DONT_HAVE_AN_ACCOUNT: '¿Aún no tienes una cuenta?', SIGN_UP: 'Crear cuenta',
  },
}

function LocalizedAuthProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage()

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      social={{ providers: ['google'] }}
      localization={authLocalization[language]}
      defaultTheme="light"
    >
      {children}
    </NeonAuthUIProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <LocalizedAuthProvider>
        <App />
      </LocalizedAuthProvider>
    </LanguageProvider>
  </StrictMode>,
);
