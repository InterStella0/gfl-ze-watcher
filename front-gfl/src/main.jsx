import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {Helmet, HelmetProvider} from '@dr.pogodin/react-helmet';
import App from './App.jsx'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider/LocalizationProvider.js';

const helmetContext = {}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider context={helmetContext}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Helmet>
              <title>Graph LULE</title>
          </Helmet>
        <App />
      </LocalizationProvider>
    </HelmetProvider>
  </StrictMode>
)
