import { useState } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Alert,
} from "@mui/material";

const AUTH_API_URL = "http://localhost:8000";

const fieldStyle = {
  "& .MuiInputLabel-root": {
    color: "#cbd5e1",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#a5b4fc",
  },
  "& .MuiOutlinedInput-root": {
    color: "#ffffff",
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    "& fieldset": {
      borderColor: "#475569",
    },
    "&:hover fieldset": {
      borderColor: "#818cf8",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#818cf8",
    },
  },
  "& input": {
    color: "#ffffff",
  },
};

function Auth({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    try {
      setLoading(true);

      if (isRegister) {
        await axios.post(`${AUTH_API_URL}/auth/register`, {
          name,
          email,
          password,
        });

        setSuccess("Account created successfully! Please log in.");
        setIsRegister(false);
        setPassword("");
      } else {
        const response = await axios.post(`${AUTH_API_URL}/auth/login`, {
          email,
          password,
        });

        sessionStorage.setItem("cloudwise_token", response.data.access_token);

        sessionStorage.setItem(
          "cloudwise_user",
          JSON.stringify(response.data.user),
        );

        onLogin(response.data.access_token, response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "radial-gradient(circle at top, #1e1b4b, #080d1b 65%)",
        p: 2,
      }}
    >
      <Paper
        elevation={20}
        sx={{
          width: "100%",
          maxWidth: 440,
          p: { xs: 3, sm: 4 },
          borderRadius: "24px",
          background: "rgba(15, 23, 42, 0.97)",
          border: "1px solid #334155",
          boxShadow: "0 25px 70px rgba(0,0,0,0.5)",
        }}
      >
        <Box textAlign="center" mb={4}>
          <Chip
            label="AI-POWERED CLOUD OPTIMIZATION"
            sx={{
              color: "#c7d2fe",
              backgroundColor: "#312e81",
              fontWeight: 600,
              mb: 2,
            }}
          />

          <Typography
            variant="h3"
            fontWeight={800}
            sx={{
              color: "#ffffff",
              letterSpacing: "-1.5px",
            }}
          >
            CloudWise{" "}
            <Box component="span" sx={{ color: "#818cf8" }}>
              AI
            </Box>
          </Typography>

          <Typography sx={{ color: "#cbd5e1", mt: 1, fontSize: "15px" }}>
            {isRegister
              ? "Create your account to get started"
              : "Welcome back! Sign in to your account."}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {isRegister && (
          <TextField
            fullWidth
            label="Full Name"
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={fieldStyle}
          />
        )}

        <TextField
          fullWidth
          label="Email Address"
          type="email"
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={fieldStyle}
        />

        <TextField
          fullWidth
          label="Password"
          type="password"
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={fieldStyle}
        />

        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={loading || !email || !password || (isRegister && !name)}
          onClick={handleSubmit}
          sx={{
            mt: 3,
            py: 1.6,
            borderRadius: "12px",
            fontWeight: 700,
            fontSize: "16px",
            textTransform: "none",
            background: "linear-gradient(90deg, #4f46e5, #9333ea)",
            "&:hover": {
              background: "linear-gradient(90deg, #4338ca, #7e22ce)",
            },
          }}
        >
          {loading ? "Please wait..." : isRegister ? "Create Account" : "Login"}
        </Button>

        <Button
          fullWidth
          sx={{
            mt: 2,
            color: "#a5b4fc",
            fontWeight: 600,
            textTransform: "none",
            "&:hover": {
              backgroundColor: "rgba(129,140,248,0.1)",
            },
          }}
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
            setSuccess("");
          }}
        >
          {isRegister
            ? "Already have an account? Login"
            : "New user? Create an account"}
        </Button>
      </Paper>
    </Box>
  );
}

export default Auth;
