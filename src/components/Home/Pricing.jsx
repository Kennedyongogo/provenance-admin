import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Tabs,
  Tab,
  Typography,
  Paper,
} from "@mui/material";

const categories = [
  "Regular",
  "Sugar Mummy",
  "Sponsor",
  "Ben 10",
  "Urban Chics",
];

export default function Pricing() {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  return (
    <Card
      sx={{
        borderRadius: "20px",
        backgroundColor: "rgba(255, 248, 220, 0.98)",
        backgroundImage:
          "linear-gradient(135deg, rgba(255, 248, 220, 0.98) 0%, rgba(255, 236, 179, 0.95) 100%)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 20px 60px rgba(212, 175, 55, 0.3)",
        border: "2px solid rgba(212, 175, 55, 0.3)",
        width: "100%",
        maxWidth: "900px",
        margin: "0 auto",
        overflow: "visible",
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          "&:last-child": {
            pb: { xs: 2, sm: 3, md: 4 },
          },
        }}
      >
        <Typography
          variant="h4"
          sx={{
            background: "linear-gradient(45deg, #D4AF37, #B8941F)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontWeight: 700,
            fontSize: { xs: "1.75rem", sm: "2rem", md: "2.25rem" },
            textAlign: "center",
            mb: 3,
          }}
        >
          Pricing Plans
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTabs-indicator": {
                backgroundColor: "#D4AF37",
                height: 3,
                borderRadius: "3px 3px 0 0",
              },
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: { xs: "0.875rem", sm: "0.9375rem", md: "1rem" },
                color: "rgba(0, 0, 0, 0.6)",
                minHeight: { xs: 48, sm: 56 },
                px: { xs: 1.5, sm: 2, md: 3 },
                "&:hover": {
                  color: "#D4AF37",
                  backgroundColor: "rgba(212, 175, 55, 0.08)",
                },
                "&.Mui-selected": {
                  color: "#D4AF37",
                  fontWeight: 700,
                },
              },
            }}
          >
            {categories.map((category, index) => (
              <Tab key={index} label={category} />
            ))}
          </Tabs>
        </Box>

        <Paper
          elevation={0}
          sx={{
            borderRadius: "16px",
            backgroundColor: "rgba(255, 255, 255, 0.6)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(212, 175, 55, 0.2)",
            p: { xs: 2, sm: 3, md: 4 },
            minHeight: "200px",
            transition: "all 0.3s ease",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "rgba(0, 0, 0, 0.9)",
                fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
                mb: 1,
              }}
            >
              {categories[selectedTab]} Plan
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  color: "rgba(0, 0, 0, 0.75)",
                  fontSize: { xs: "0.9375rem", sm: "1rem", md: "1.0625rem" },
                  lineHeight: 1.7,
                }}
              >
                {selectedTab === 0 && (
                  <>
                    The Regular plan is perfect for users looking to connect and
                    discover new people. This plan includes basic features and
                    access to regular member profiles.
                  </>
                )}
                {selectedTab === 1 && (
                  <>
                    The Sugar Mummy plan offers premium features for verified
                    members. Enjoy enhanced visibility, priority support, and
                    access to exclusive features designed for mature connections.
                  </>
                )}
                {selectedTab === 2 && (
                  <>
                    The Sponsor plan provides premium benefits for verified
                    sponsors. Get access to verified profiles, enhanced matching,
                    and priority customer support.
                  </>
                )}
                {selectedTab === 3 && (
                  <>
                    The Ben 10 plan is designed for verified premium members.
                    Access exclusive features, enhanced profile visibility, and
                    priority matching with verified members.
                  </>
                )}
                {selectedTab === 4 && (
                  <>
                    The Urban Chics plan offers premium features for verified
                    urban members. Enjoy enhanced visibility, exclusive access
                    to curated profiles, and priority support.
                  </>
                )}
              </Typography>

              <Box
                component="ul"
                sx={{
                  mt: 2,
                  pl: { xs: 2, sm: 3 },
                  mb: 0,
                  "& li": {
                    color: "rgba(0, 0, 0, 0.75)",
                    fontSize: { xs: "0.9375rem", sm: "1rem" },
                    lineHeight: 1.8,
                    mb: 1,
                  },
                }}
              >
                {selectedTab === 0 && (
                  <>
                    <li>Access to regular member profiles</li>
                    <li>Basic search and filter options</li>
                    <li>Standard messaging features</li>
                    <li>Profile creation and management</li>
                  </>
                )}
                {selectedTab === 1 && (
                  <>
                    <li>Enhanced profile visibility</li>
                    <li>Priority customer support</li>
                    <li>Access to verified premium profiles</li>
                    <li>Advanced search and filter options</li>
                    <li>Exclusive premium features</li>
                  </>
                )}
                {selectedTab === 2 && (
                  <>
                    <li>Verified sponsor badge</li>
                    <li>Enhanced profile visibility</li>
                    <li>Priority matching with verified members</li>
                    <li>Advanced search and filter options</li>
                    <li>Exclusive sponsor features</li>
                  </>
                )}
                {selectedTab === 3 && (
                  <>
                    <li>Verified Ben 10 badge</li>
                    <li>Enhanced profile visibility</li>
                    <li>Priority matching with verified members</li>
                    <li>Advanced search and filter options</li>
                    <li>Exclusive premium features</li>
                  </>
                )}
                {selectedTab === 4 && (
                  <>
                    <li>Verified Urban Chics badge</li>
                    <li>Enhanced profile visibility</li>
                    <li>Access to curated urban profiles</li>
                    <li>Advanced search and filter options</li>
                    <li>Exclusive premium features</li>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>
      </CardContent>
    </Card>
  );
}

