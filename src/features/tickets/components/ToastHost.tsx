import { Alert, Snackbar } from '@mui/material';
import { useToastStore } from '../store/toastStore';

export function ToastHost() {
  const { open, message, severity, hide } = useToastStore();
  return (
    <Snackbar open={open} autoHideDuration={3200} onClose={hide} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert onClose={hide} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
