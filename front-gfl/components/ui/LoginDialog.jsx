import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
} from "@mui/material";
import Typography from "@mui/material/Typography";
import {signIn} from "next-auth/react";
import SteamIcon from "components/ui/SteamIcon";

export default function LoginDialog({ open, onClose }) {
    const handleSteamLogin = () => {
        onClose();
        signIn("steam")
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                <Typography variant="h5" component="div" fontWeight="600">
                    Welcome Back
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Sign in
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ px: 4, pb: 4 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                    <Typography variant="body1" color="text.secondary" textAlign="center">
                        Continue with your steam account to access all features <br />
                    </Typography>
                    <Button
                        startIcon={<SteamIcon />}
                        onClick={handleSteamLogin}
                        variant="contained"
                        size="large"
                        fullWidth
                        sx={{
                            backgroundColor: '#1b2838',
                            py: 1.5,
                            fontSize: '1rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            borderRadius: 2,
                            boxShadow: '0 4px 12px rgba(27, 40, 56, 0.4)',
                            '&:hover': {
                                backgroundColor: '#0d161f',
                                boxShadow: '0 6px 16px rgba(27, 40, 56, 0.5)',
                                transform: 'translateY(-1px)',
                            },
                            transition: 'all 0.2s ease-in-out',
                        }}
                    >
                        Login with Steam
                    </Button>

                    <Typography variant="caption" color="text.secondary" textAlign="center" mt={1}>
                        By continuing, you will be redirected to a third-party site for authentication.
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );
}