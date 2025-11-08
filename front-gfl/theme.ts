'use client'
import {createTheme} from "@mui/material/styles";
import {responsiveFontSizes} from "@mui/material";

const theme = createTheme({
    cssVariables: true,
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                },
            },
        },
        MuiCssBaseline: {
            styleOverrides: {
                '*::-webkit-scrollbar': {
                    width: '8px',
                },
                '*::-webkit-scrollbar-track': {
                    background: '#f1f1f1',
                },
                '*::-webkit-scrollbar-thumb': {
                    background: '#888',
                    borderRadius: '4px',
                },
                '*::-webkit-scrollbar-thumb:hover': {
                    background: '#555',
                },
            },

        }
    },
    colorSchemes: {
        light: {
            palette: {
                primary: { main: '#c2185b' },
                secondary: { main: '#f48fb1' },
                background: { default: '#ffffff', paper: '#f5f5f5' },
                text: { primary: '#333' },
            },
        },
        dark: {
            palette: {
                primary: { main: '#bb86fc' },
                secondary: { main: '#03dac6' },
                background: { default: '#121212', paper: '#1e1e1e' },
                text: { primary: '#e0e0e0' },
            },
        },

    },
})
// theme = responsiveFontSizes(theme);
export default theme;