package com.futuresai.signal.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.futuresai.signal.ui.components.NeonOrbitProgress
import com.futuresai.signal.ui.theme.*

@Composable
fun HomeScreen() {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgSurface)
            .verticalScroll(scrollState)
            .padding(14.dp)
    ) {
        // Top Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "FUTURES AI",
                color = TextWhite,
                fontSize = 20.sp,
                fontWeight = FontWeight.ExtraBold
            )
            Text(
                text = "● LIVE",
                color = NeonGreen,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Training Orbit Card (Direct matching with mobile_mockup.html)
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .border(1.dp, NeonPurple.copy(alpha = 0.35f), RoundedCornerShape(22.dp)),
            colors = CardDefaults.cardColors(containerColor = BgCard)
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "TRAINING",
                    color = TextMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(12.dp))

                NeonOrbitProgress(
                    progressPercent = 72,
                    label = "BTCUSDT • MULTI TIMEFRAME"
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Active Signal Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .border(1.dp, NeonGreen.copy(alpha = 0.3f), RoundedCornerShape(22.dp)),
            colors = CardDefaults.cardColors(containerColor = BgCard)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Text(
                    text = "ACTIVE SIGNAL",
                    color = TextMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "LONG",
                        color = NeonGreen,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Text(
                        text = "Güven: %87",
                        color = NeonPurple,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Text(
                    text = "BTCUSDT • 15m",
                    color = TextWhite,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text("Giriş: 104,250 USDT", color = NeonCyan, fontSize = 12.sp)
                Text("TP1: 104,720 USDT (%81 Olasılık)", color = NeonGreen, fontSize = 12.sp)
                Text("TP2: 105,180 USDT (%63 Olasılık)", color = NeonGreen, fontSize = 12.sp)
                Text("SL: 103,820 USDT (%17 Olasılık)", color = NeonRed, fontSize = 12.sp)
            }
        }
    }
}
