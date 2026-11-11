import Auth from "./Auth";
import { useState, useEffect } from "react";
import axios from "axios";

import {
  Container,
  Typography,
  Paper,
  Button,
  Box,
  TextField,
  MenuItem,
  ThemeProvider,
  createTheme,
  Chip,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";


const PROVIDERS = ["AWS", "Azure", "GCP"];

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0b1120",
      paper: "#111827",
    },
    primary: {
      main: "#6366f1",
    },
  },

  typography: {
    fontFamily: "Inter, Segoe UI, Roboto, Arial, sans-serif",
  },

  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiInputLabel-root": {
            color: "#94a3b8",
          },

          "& .MuiInputLabel-root.Mui-focused": {
            color: "#818cf8",
          },

          "& .MuiOutlinedInput-root": {
            color: "#ffffff",
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            borderRadius: "14px",

            "& fieldset": {
              borderColor: "#334155",
            },

            "&:hover fieldset": {
              borderColor: "#6366f1",
            },

            "&.Mui-focused fieldset": {
              borderColor: "#818cf8",
            },
          },

          "& .MuiSelect-select": {
            color: "#ffffff",
          },

          "& .MuiSelect-icon": {
            color: "#94a3b8",
          },
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: "#ffffff",
          backgroundColor: "#111827",

          "&:hover": {
            backgroundColor: "#1e293b",
          },

          "&.Mui-selected": {
            backgroundColor: "#312e81",
          },
        },
      },
    },
  },
});

function App() {
  // -------------------------------------------------
  // 1. Application states
  // -------------------------------------------------

  const [recommendation, setRecommendation] = useState(null);

  const [metadata, setMetadata] = useState({});

  const [cloudProvider, setCloudProvider] = useState("AWS");

  const [loading, setLoading] = useState(false);

  const [metadataLoading, setMetadataLoading] = useState(true);

  const [region, setRegion] = useState("us-east-1");

  const [instanceFamily, setInstanceFamily] = useState("");

  const [vcpu, setVcpu] = useState(2);

  const [ram, setRam] = useState(8);

  const [gpuCount, setGpuCount] = useState(0);

  const [operatingSystem, setOperatingSystem] = useState("Linux");

  const [usageHours, setUsageHours] = useState(730);

  const [authToken, setAuthToken] = useState(() =>
    sessionStorage.getItem("cloudwise_token"),
  );

  const [loggedInUser, setLoggedInUser] = useState(() => {
    const user = sessionStorage.getItem("cloudwise_user");
    return user ? JSON.parse(user) : null;
  });

  const handleLogout = () => {
    sessionStorage.removeItem("cloudwise_token");
    sessionStorage.removeItem("cloudwise_user");

    setAuthToken(null);
    setLoggedInUser(null);
  };

  // -------------------------------------------------
  // 2. Fetch metadata from FastAPI
  // -------------------------------------------------

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setMetadataLoading(true);

        const response = await axios.get(`${API_URL}/metadata`);

        setMetadata(response.data);

        console.log("Cloud metadata loaded:", response.data);
      } catch (error) {
        console.error("Failed to load cloud metadata:", error);

        alert(
          "Unable to load cloud metadata. Please check whether the backend is running.",
        );
      } finally {
        setMetadataLoading(false);
      }
    };

    fetchMetadata();
  }, []);

  // -------------------------------------------------
  // 3. Update region and family when provider changes
  // -------------------------------------------------

  useEffect(() => {
    const providerData = metadata[cloudProvider];

    if (!providerData) {
      return;
    }

    const availableRegions = providerData.regions || [];

    const availableFamilies = providerData.instance_families || [];

    setRegion((currentRegion) =>
      availableRegions.includes(currentRegion)
        ? currentRegion
        : availableRegions[0] || "",
    );

    setInstanceFamily((currentFamily) =>
      availableFamilies.includes(currentFamily)
        ? currentFamily
        : availableFamilies[0] || "",
    );

    setRecommendation(null);
  }, [metadata, cloudProvider]);

  // -------------------------------------------------
  // 4. Get cloud recommendation from FastAPI
  // -------------------------------------------------

  const getRecommendation = async () => {
    if (!region || !instanceFamily) {
      alert("Please select a valid region and instance family.");
      return;
    }

    if (vcpu <= 0 || ram <= 0 || usageHours <= 0) {
      alert("Please enter valid CPU, RAM and usage hours.");
      return;
    }

    const payload = {
      Cloud_Provider: cloudProvider,
      Region: region,
      Instance_Family: instanceFamily,

      vCPU: Number(vcpu),
      RAM_GB: Number(ram),
      GPU_Count: Number(gpuCount),

      Operating_System: operatingSystem,

      Usage_Hours_Per_Month: Number(usageHours),
    };

    try {
      setLoading(true);

      setRecommendation(null);

      const response = await axios.post(`${API_URL}/recommend`, payload);

      setRecommendation(response.data);

      console.log("Recommendation response:", response.data);
    } catch (error) {
      console.error(
        "Recommendation error:",
        error.response?.data || error.message,
      );

      const errorMessage =
        error.response?.data?.detail ||
        "Recommendation failed. Please check the backend and try again.";

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------
  // 5. Reset configuration
  // -------------------------------------------------

  const resetConfiguration = () => {
    const defaultProvider = "AWS";

    const defaultProviderData = metadata[defaultProvider];

    setCloudProvider(defaultProvider);

    setRegion(
      defaultProviderData?.regions?.includes("us-east-1")
        ? "us-east-1"
        : defaultProviderData?.regions?.[0] || "",
    );

    setInstanceFamily(defaultProviderData?.instance_families?.[0] || "");

    setVcpu(2);
    setRam(8);
    setGpuCount(0);

    setOperatingSystem("Linux");

    setUsageHours(730);

    setRecommendation(null);
  };

  // -------------------------------------------------
  // 6. Format cost values safely
  // -------------------------------------------------

  const formatCost = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      !Number.isFinite(Number(value))
    ) {
      return "Not available";
    }

    return Number(value).toFixed(2);
  };

  // -------------------------------------------------
  // 7. Prepare chart data
  // -------------------------------------------------

  const chartData = recommendation
    ? PROVIDERS.map((provider) => ({
        provider,
        cost:
          recommendation[provider] == null
            ? null
            : Number(recommendation[provider]),
      })).filter((entry) => entry.cost !== null)
    : [];

  // -------------------------------------------------
  // 8. Calculate annual savings
  // -------------------------------------------------

  const annualSavings = recommendation
    ? Number(recommendation.Potential_Savings_USD || 0) * 12
    : 0;

  // -------------------------------------------------
  // 9. Resource optimization calculations
  // -------------------------------------------------

  const resourceOptimization = recommendation?.Resource_Optimization || null;

  const resourceSavings = resourceOptimization
    ? Number(resourceOptimization.Savings_vs_Current_Recommendation_USD || 0)
    : 0;

  const optimizedAnnualSavings = resourceSavings * 12;

  const providerData = metadata[cloudProvider] || {};

  const availableRegions = providerData.regions || [];

  const availableFamilies = providerData.instance_families || [];

  // -------------------------------------------------
  // 10. UI
  // -------------------------------------------------

  if (!authToken) {
    return (
      <Auth
        onLogin={(token, user) => {
          setAuthToken(token);
          setLoggedInUser(user);
        }}
      />
    );
  }
  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",

          background:
            "radial-gradient(circle at 15% 20%, rgba(99,102,241,0.18), transparent 30%), radial-gradient(circle at 85% 80%, rgba(14,165,233,0.16), transparent 30%), linear-gradient(135deg, #020617 0%, #0f172a 50%, #111827 100%)",

          py: 6,
        }}
      >
        {/* Background decoration */}

        <Box
          sx={{
            position: "absolute",
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: "rgba(99,102,241,0.08)",
            filter: "blur(10px)",
            top: -120,
            left: -120,
          }}
        />

        <Box
          sx={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(14,165,233,0.08)",
            filter: "blur(10px)",
            bottom: -100,
            right: -100,
          }}
        />

        <Container
          maxWidth="md"
          sx={{
            position: "relative",
            zIndex: 2,
          }}
        >
          <Paper
            elevation={24}
            sx={{
              p: { xs: 3, md: 6 },
              borderRadius: "28px",
              background: "rgba(15, 23, 42, 0.88)",
              backdropFilter: "blur(18px)",
              border: "1px solid rgba(148,163,184,0.15)",
            }}
          >
            {/* Header */}

            <Box
              sx={{
                textAlign: "center",
                mb: 5,
                position: "relative",
              }}
            >
              {/* User Welcome - Left and Logout - Right */}

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 4,
                  gap: 2,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                {loggedInUser && (
                  <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
                    <Typography
                      sx={{
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "1rem",
                      }}
                    >
                      Welcome, {loggedInUser.name}!
                    </Typography>

                    <Typography
                      sx={{
                        color: "#94a3b8",
                        fontSize: "0.85rem",
                        mt: 0.5,
                      }}
                    >
                      {loggedInUser.email}
                    </Typography>
                  </Box>
                )}

                <Button
                  variant="outlined"
                  onClick={handleLogout}
                  sx={{
                    color: "#c7d2fe",
                    borderColor: "rgba(129,140,248,0.5)",
                    borderRadius: "10px",
                    textTransform: "none",
                    fontWeight: 600,
                    "&:hover": {
                      backgroundColor: "rgba(99,102,241,0.15)",
                      borderColor: "#818cf8",
                    },
                  }}
                >
                  Logout
                </Button>
              </Box>

              {/* Project Branding */}

              <Chip
                label="AI-POWERED CLOUD OPTIMIZATION"
                sx={{
                  mb: 2,
                  color: "#c7d2fe",
                  backgroundColor: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(129,140,248,0.3)",
                  fontWeight: 600,
                  letterSpacing: 1,
                }}
              />

              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-1px",
                  fontSize: {
                    xs: "2.5rem",
                    md: "4rem",
                  },
                  background:
                    "linear-gradient(90deg, #ffffff, #a5b4fc, #67e8f9)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                CloudWise AI
              </Typography>

              <Typography
                sx={{
                  mt: 2,
                  color: "#94a3b8",
                  fontSize: {
                    xs: "1rem",
                    md: "1.15rem",
                  },
                  lineHeight: 1.7,
                }}
              >
                Intelligent Multi-Cloud Cost Prediction & Optimization Platform
              </Typography>
            </Box>

            {/* Cloud Configuration */}

            <Box
              sx={{
                p: {
                  xs: 2,
                  md: 3,
                },

                borderRadius: "20px",

                background: "rgba(30, 41, 59, 0.55)",

                border: "1px solid rgba(148,163,184,0.1)",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  mb: 3,
                  fontWeight: 700,
                  color: "#f8fafc",
                }}
              >
                Cloud Configuration
              </Typography>

              <Grid container spacing={2.5}>
                {/* Cloud Provider */}

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Cloud Provider"
                    value={cloudProvider}
                    onChange={(e) => {
                      setCloudProvider(e.target.value);
                    }}
                  >
                    {PROVIDERS.map((provider) => (
                      <MenuItem key={provider} value={provider}>
                        {provider}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Region */}

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    disabled={metadataLoading || availableRegions.length === 0}
                  >
                    {availableRegions.map((item) => (
                      <MenuItem key={item} value={item}>
                        {item}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Instance Family */}

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Instance Family"
                    value={instanceFamily}
                    onChange={(e) => setInstanceFamily(e.target.value)}
                    disabled={metadataLoading || availableFamilies.length === 0}
                  >
                    {availableFamilies.map((family) => (
                      <MenuItem key={family} value={family}>
                        {family}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* vCPU */}

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="vCPU"
                    value={vcpu}
                    onChange={(e) => setVcpu(Number(e.target.value))}
                    inputProps={{
                      min: 1,
                    }}
                  />
                </Grid>

                {/* RAM */}

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="RAM (GB)"
                    value={ram}
                    onChange={(e) => setRam(Number(e.target.value))}
                    inputProps={{
                      min: 1,
                    }}
                  />
                </Grid>

                {/* GPU Count */}

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="GPU Count"
                    value={gpuCount}
                    onChange={(e) => setGpuCount(Number(e.target.value))}
                  >
                    <MenuItem value={0}>0 - No GPU</MenuItem>

                    <MenuItem value={1}>1 GPU</MenuItem>

                    <MenuItem value={2}>2 GPUs</MenuItem>

                    <MenuItem value={4}>4 GPUs</MenuItem>
                  </TextField>
                </Grid>

                {/* Operating System */}

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Operating System"
                    value={operatingSystem}
                    onChange={(e) => setOperatingSystem(e.target.value)}
                  >
                    <MenuItem value="Linux">Linux</MenuItem>
                  </TextField>
                </Grid>

                {/* Usage Hours */}

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Usage Hours / Month"
                    value={usageHours}
                    onChange={(e) => setUsageHours(Number(e.target.value))}
                  >
                    <MenuItem value={360}>360 Hours</MenuItem>

                    <MenuItem value={500}>500 Hours</MenuItem>

                    <MenuItem value={730}>730 Hours</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              {/* Compare Button */}

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={getRecommendation}
                disabled={
                  loading || metadataLoading || !region || !instanceFamily
                }
                sx={{
                  mt: 4,
                  py: 1.7,
                  borderRadius: "14px",
                  fontSize: "1rem",
                  fontWeight: 700,
                  textTransform: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",

                  background: "linear-gradient(90deg, #4f46e5, #7c3aed)",

                  boxShadow: "0 10px 30px rgba(79,70,229,0.3)",

                  "&:hover": {
                    background: "linear-gradient(90deg, #4338ca, #6d28d9)",
                  },
                }}
              >
                {loading ? (
                  <>
                    <CircularProgress
                      size={22}
                      sx={{
                        color: "#ffffff",
                        mr: 1.5,
                      }}
                    />
                    Analyzing Cloud Costs...
                  </>
                ) : (
                  "Compare & Optimize"
                )}
              </Button>

              {/* Reset Button */}

              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={resetConfiguration}
                disabled={loading}
                sx={{
                  mt: 1.5,
                  py: 1.4,
                  borderRadius: "14px",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  textTransform: "none",
                  color: "#cbd5e1",
                  borderColor: "#475569",

                  "&:hover": {
                    borderColor: "#818cf8",
                    backgroundColor: "rgba(99,102,241,0.08)",
                  },
                }}
              >
                Reset Configuration
              </Button>
            </Box>

            {/* Results */}

            {recommendation && (
              <Box sx={{ mt: 4 }}>
                <Typography
                  variant="h5"
                  sx={{
                    mb: 2.5,
                    fontWeight: 700,
                    color: "#f8fafc",
                  }}
                >
                  Cost Comparison
                </Typography>

                {/* Provider Cards */}

                <Grid container spacing={2}>
                  {PROVIDERS.map((provider) => (
                    <Grid size={{ xs: 12, md: 4 }} key={provider}>
                      <Card
                        sx={{
                          background:
                            recommendation.Recommended_Provider === provider
                              ? "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(15,23,42,0.85))"
                              : "rgba(30, 41, 59, 0.7)",

                          border:
                            recommendation.Recommended_Provider === provider
                              ? "2px solid #4ade80"
                              : "1px solid rgba(148,163,184,0.12)",

                          borderRadius: "18px",

                          transform:
                            recommendation.Recommended_Provider === provider
                              ? "translateY(-4px)"
                              : "none",

                          transition: "all 0.3s ease",

                          boxShadow:
                            recommendation.Recommended_Provider === provider
                              ? "0 12px 30px rgba(34,197,94,0.15)"
                              : "none",
                        }}
                      >
                        <CardContent>
                          {recommendation.Recommended_Provider === provider && (
                            <Chip
                              label="✓ RECOMMENDED"
                              size="small"
                              sx={{
                                mb: 1.5,
                                color: "#86efac",
                                backgroundColor: "rgba(34,197,94,0.15)",
                                border: "1px solid rgba(74,222,128,0.25)",
                                fontWeight: 700,
                              }}
                            />
                          )}

                          <Typography
                            sx={{
                              color: "#f8fafc",
                              fontWeight: 700,
                              fontSize: "1.1rem",
                            }}
                          >
                            {provider}
                          </Typography>

                          <Typography
                            variant="h4"
                            sx={{
                              mt: 1,

                              color:
                                recommendation.Recommended_Provider === provider
                                  ? "#4ade80"
                                  : "#f8fafc",

                              fontWeight: 800,
                            }}
                          >
                            {recommendation[provider] == null
                              ? "Not available"
                              : `$${formatCost(recommendation[provider])}`}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {/* Resource Optimization */}

                {resourceOptimization && (
                  <Box
                    sx={{
                      mt: 3,
                      p: { xs: 2, md: 3 },
                      borderRadius: "20px",

                      background:
                        "linear-gradient(135deg, rgba(99,102,241,0.16), rgba(14,165,233,0.06))",

                      border: "1px solid rgba(99,102,241,0.25)",
                    }}
                  >
                    <Chip
                      label="AI RESOURCE OPTIMIZATION"
                      size="small"
                      sx={{
                        mb: 1.5,
                        color: "#c4b5fd",
                        backgroundColor: "rgba(99,102,241,0.15)",
                        fontWeight: 700,
                      }}
                    />

                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                        color: "#f8fafc",
                        mb: 2,
                      }}
                    >
                      Smarter Resource Recommendation
                    </Typography>

                    <Typography
                      sx={{
                        color: "#94a3b8",
                        mb: 3,
                      }}
                    >
                      CloudWise AI compared actual cloud catalogue instances to
                      identify a lower-cost configuration.
                    </Typography>

                    <Typography
                      sx={{
                        color: "#94a3b8",
                        fontSize: "0.85rem",
                      }}
                    >
                      OPTIMIZED MONTHLY COST
                    </Typography>

                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 800,
                        color: "#67e8f9",
                        mb: 3,
                      }}
                    >
                      $
                      {formatCost(
                        resourceOptimization.Optimized_Monthly_Cost_USD,
                      )}
                    </Typography>

                    <Grid container spacing={2}>
                      {/* Recommended Resource */}

                      <Grid size={{ xs: 12, md: 6 }}>
                        <Card
                          sx={{
                            height: "100%",
                            background: "rgba(15,23,42,0.65)",
                            border: "1px solid rgba(129,140,248,0.22)",
                            borderRadius: "16px",
                          }}
                        >
                          <CardContent>
                            <Typography sx={{ color: "#94a3b8" }}>
                              RECOMMENDED RESOURCE
                            </Typography>

                            <Typography
                              variant="h5"
                              sx={{
                                mt: 1,
                                color: "#ffffff",
                                fontWeight: 800,
                              }}
                            >
                              {resourceOptimization.Recommended_Instance_Family}
                            </Typography>

                            <Typography
                              sx={{
                                mt: 1,
                                color: "#cbd5e1",
                              }}
                            >
                              Provider:{" "}
                              <strong>
                                {resourceOptimization.Recommended_Provider}
                              </strong>
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Resource Savings */}

                      <Grid size={{ xs: 12, md: 6 }}>
                        <Card
                          sx={{
                            height: "100%",
                            background: "rgba(15,23,42,0.65)",
                            border: "1px solid rgba(34,197,94,0.2)",
                            borderRadius: "16px",
                          }}
                        >
                          <CardContent>
                            <Typography sx={{ color: "#94a3b8" }}>
                              ADDITIONAL OPTIMIZATION SAVINGS
                            </Typography>

                            <Typography
                              variant="h5"
                              sx={{
                                mt: 1,
                                color: "#4ade80",
                                fontWeight: 800,
                              }}
                            >
                              ${formatCost(resourceSavings)} / month
                            </Typography>

                            <Typography
                              sx={{
                                mt: 1,
                                color: "#86efac",
                                fontWeight: 700,
                              }}
                            >
                              {Number(
                                resourceOptimization.Savings_Percentage || 0,
                              ).toFixed(2)}
                              % additional savings
                            </Typography>

                            <Typography
                              sx={{
                                mt: 0.5,
                                color: "#94a3b8",
                                fontSize: "0.9rem",
                              }}
                            >
                              ${formatCost(optimizedAnnualSavings)} estimated
                              yearly
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* Instance Family Comparison */}

                    <Box sx={{ mt: 3 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          mb: 2,
                          color: "#f8fafc",
                          fontWeight: 700,
                        }}
                      >
                        Instance Family Comparison
                      </Typography>

                      <Grid container spacing={1.5}>
                        {(resourceOptimization.Options || []).map((option) => {
                          const isOptimized =
                            option.Instance_Family ===
                              resourceOptimization.Recommended_Instance_Family &&
                            option.Provider ===
                              resourceOptimization.Recommended_Provider;

                          return (
                            <Grid
                              size={{ xs: 12, sm: 6, md: 3 }}
                              key={`${option.Provider}-${option.Instance_Family}`}
                            >
                              <Card
                                sx={{
                                  height: "100%",

                                  background: isOptimized
                                    ? "rgba(34,197,94,0.12)"
                                    : "rgba(15,23,42,0.55)",

                                  border: isOptimized
                                    ? "2px solid #4ade80"
                                    : "1px solid rgba(148,163,184,0.12)",

                                  borderRadius: "14px",
                                }}
                              >
                                <CardContent>
                                  {isOptimized && (
                                    <Chip
                                      label="BEST"
                                      size="small"
                                      sx={{
                                        mb: 1,
                                        color: "#86efac",
                                        backgroundColor: "rgba(34,197,94,0.15)",
                                        fontWeight: 700,
                                      }}
                                    />
                                  )}

                                  <Typography
                                    sx={{
                                      color: "#f8fafc",
                                      fontWeight: 700,
                                      fontSize: "0.95rem",
                                    }}
                                  >
                                    {option.Instance_Family}
                                  </Typography>

                                  <Typography
                                    sx={{
                                      mt: 1,
                                      color: isOptimized
                                        ? "#4ade80"
                                        : "#cbd5e1",
                                      fontWeight: 800,
                                      fontSize: "1.15rem",
                                    }}
                                  >
                                    ${formatCost(option.Monthly_Cost_USD)}
                                  </Typography>

                                  <Typography
                                    sx={{
                                      mt: 0.5,
                                      color: "#64748b",
                                      fontSize: "0.8rem",
                                    }}
                                  >
                                    {option.Provider}
                                  </Typography>

                                  <Typography
                                    sx={{
                                      mt: 0.5,
                                      color: "#94a3b8",
                                      fontSize: "0.8rem",
                                    }}
                                  >
                                    {option.Instance_Type} · {option.Region}
                                  </Typography>

                                  <Typography
                                    sx={{
                                      mt: 0.5,
                                      color: "#94a3b8",
                                      fontSize: "0.8rem",
                                    }}
                                  >
                                    {option.vCPU} vCPU · {option.RAM_GB} GB RAM
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  </Box>
                )}

                {/* Cost Chart */}

                <Box
                  sx={{
                    mt: 3,
                    p: 3,
                    borderRadius: "20px",
                    background: "rgba(30, 41, 59, 0.55)",
                    border: "1px solid rgba(148,163,184,0.1)",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 3,
                      fontWeight: 700,
                      color: "#f8fafc",
                    }}
                  >
                    Monthly Cost Comparison
                  </Typography>

                  <Box
                    sx={{
                      width: "100%",
                      height: 320,
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

                        <XAxis dataKey="provider" stroke="#94a3b8" />

                        <YAxis stroke="#94a3b8" />

                        <Tooltip
                          formatter={(value) => [
                            `$${formatCost(value)}`,
                            "Monthly Cost",
                          ]}
                          contentStyle={{
                            backgroundColor: "#111827",
                            border: "1px solid #334155",
                            borderRadius: "10px",
                          }}
                          labelStyle={{
                            color: "#ffffff",
                            fontWeight: 700,
                          }}
                          itemStyle={{
                            color: "#ffffff",
                          }}
                        />

                        <Legend />

                        <Bar
                          dataKey="cost"
                          name="Monthly Cost"
                          radius={[8, 8, 0, 0]}
                        >
                          {chartData.map((entry) => (
                            <Cell
                              key={entry.provider}
                              fill={
                                entry.provider ===
                                recommendation.Recommended_Provider
                                  ? "#4ade80"
                                  : "#6366f1"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>

                {/* Main Recommendation */}

                <Box
                  sx={{
                    mt: 3,
                    p: 3,
                    borderRadius: "20px",

                    background:
                      "linear-gradient(135deg, rgba(34,197,94,0.14), rgba(16,185,129,0.05))",

                    border: "1px solid rgba(34,197,94,0.25)",

                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: 1.3,
                    }}
                  >
                    Recommended Provider
                  </Typography>

                  <Typography
                    variant="h3"
                    sx={{
                      mt: 1,
                      fontWeight: 800,
                      color: "#4ade80",
                    }}
                  >
                    {recommendation.Recommended_Provider}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,
                      color: "#cbd5e1",
                    }}
                  >
                    Estimated Monthly Cost: $
                    {formatCost(recommendation.Recommended_Monthly_Cost_USD)}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,
                      color: "#86efac",
                      fontWeight: 700,
                    }}
                  >
                    Potential Savings: $
                    {formatCost(recommendation.Potential_Savings_USD)}
                    {" / month"}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,
                      color: "#67e8f9",
                      fontWeight: 700,
                    }}
                  >
                    Annual Savings: ${annualSavings.toFixed(2)} / year
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,
                      color: "#c4b5fd",
                      fontWeight: 700,
                    }}
                  >
                    Savings Percentage:{" "}
                    {Number(recommendation.Savings_Percentage || 0).toFixed(2)}%
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
