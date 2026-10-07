import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import PlayerPage from './pages/PlayerPage'
import BoardPage from './pages/BoardPage'
import HostPage from './pages/HostPage'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<PlayerPage />} />
      <Route path="/board" element={<BoardPage />} />
      <Route path="/host" element={<HostPage />} />
    </Routes>
  </BrowserRouter>
)
