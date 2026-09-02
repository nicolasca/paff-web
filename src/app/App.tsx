import { Route, Routes } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'

type AppProps = {
  convexConfigured: boolean
}

export function App({ convexConfigured }: AppProps) {
  return (
    <Routes>
      <Route path="/" element={<HomePage convexConfigured={convexConfigured} />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
