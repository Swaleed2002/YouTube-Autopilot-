package com.faceless.autopilot

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.faceless.autopilot.data.*
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FacelessAutopilotApp()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FacelessAutopilotApp() {
    var selectedTab by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    var statusData by remember { mutableStateOf<SystemStatusResponse?>(null) }
    var videoList by remember { mutableStateOf<List<VideoItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }

    fun refreshData() {
        scope.launch {
            try {
                isLoading = true
                statusData = NetworkClient.api.getStatus()
                videoList = NetworkClient.api.getVideos().videos
            } catch (e: Exception) {
                // Handle offline or fallback
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        refreshData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Faceless Autopilot", fontWeight = FontWeight.Black, color = Color.White)
                        Spacer(Modifier.width(8.dp))
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (statusData?.automationEnabled == true) Color(0xFF10B981) else Color(0xFF6B7280)
                        ) {
                            Text(
                                if (statusData?.automationEnabled == true) "AUTO ACTIVE" else "PAUSED",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF0F172A)
                ),
                actions = {
                    IconButton(onClick = { refreshData() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Color.White)
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar(containerColor = Color(0xFF0F172A)) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                    label = { Text("Home") }
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.VideoLibrary, contentDescription = "Videos") },
                    label = { Text("Videos") }
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.Tune, contentDescription = "Automation") },
                    label = { Text("Autopilot") }
                )
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = { Icon(Icons.Default.Analytics, contentDescription = "Analytics") },
                    label = { Text("Analytics") }
                )
                NavigationBarItem(
                    selected = selectedTab == 4,
                    onClick = { selectedTab = 4 },
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings") }
                )
            }
        },
        containerColor = Color(0xFF020617)
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            when (selectedTab) {
                0 -> HomeScreen(statusData, onEmergencyStop = {
                    scope.launch {
                        NetworkClient.api.triggerEmergencyStop()
                        refreshData()
                    }
                }, onResume = {
                    scope.launch {
                        NetworkClient.api.resumeFromEmergencyStop()
                        refreshData()
                    }
                }, onQuickGenerate = { fmt ->
                    scope.launch {
                        NetworkClient.api.generateVideo(GenerateVideoRequest(fmt, null, null))
                        refreshData()
                        selectedTab = 1
                    }
                })
                1 -> VideosScreen(videoList, onRetry = { id ->
                    scope.launch {
                        NetworkClient.api.retryVideo(id)
                        refreshData()
                    }
                }, onPublish = { id ->
                    scope.launch {
                        NetworkClient.api.publishVideo(id)
                        refreshData()
                    }
                })
                2 -> AutomationScreen(statusData, onToggle = { enabled ->
                    scope.launch {
                        NetworkClient.api.toggleAutomation(ToggleAutomationRequest(enabled))
                        refreshData()
                    }
                })
                3 -> AnalyticsScreen(statusData)
                4 -> SettingsScreen(statusData)
            }
        }
    }
}

@Composable
fun HomeScreen(
    status: SystemStatusResponse?,
    onEmergencyStop: () -> Unit,
    onResume: () -> Unit,
    onQuickGenerate: (String) -> Unit
) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        item {
            // Emergency STOP Banner
            if (status?.emergencyStop == true) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFDC2626)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = Color.White)
                            Spacer(Modifier.width(8.dp))
                            Text("EMERGENCY STOP ACTIVE", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        Text("All background pipelines and scheduled uploads are stopped.", color = Color.White.copy(alpha = 0.9f), fontSize = 12.sp)
                        Spacer(Modifier.height(10.dp))
                        Button(
                            onClick = onResume,
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White)
                        ) {
                            Text("Resume Operations", color = Color(0xFFDC2626), fontWeight = FontWeight.Bold)
                        }
                    }
                }
            } else {
                // Emergency Stop Button
                Button(
                    onClick = onEmergencyStop,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB91C1C)),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.Stop, contentDescription = null, tint = Color.White)
                    Spacer(Modifier.width(8.dp))
                    Text("EMERGENCY STOP (HALT ALL PIPELINES)", fontWeight = FontWeight.Bold, color = Color.White)
                }
            }

            // Target Quotas Progress Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text("Monthly Production Targets", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                    Spacer(Modifier.height(12.dp))
                    Text("Shorts: ${status?.counts?.shortsThisMonth ?: 0} / 40 targeted", color = Color(0xFF38BDF8), fontWeight = FontWeight.Medium)
                    LinearProgressIndicator(
                        progress = { ((status?.counts?.shortsThisMonth ?: 0).toFloat() / 40f).coerceIn(0f, 1f) },
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        color = Color(0xFF38BDF8)
                    )
                    Spacer(Modifier.height(8.dp))
                    Text("Long-Form: ${status?.counts?.longThisMonth ?: 0} / 20 targeted", color = Color(0xFFA855F7), fontWeight = FontWeight.Medium)
                    LinearProgressIndicator(
                        progress = { ((status?.counts?.longThisMonth ?: 0).toFloat() / 20f).coerceIn(0f, 1f) },
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        color = Color(0xFFA855F7)
                    )
                }
            }

            // Budget Gauge Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Operating Budget", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                        Text("Ceiling: AED 500", fontSize = 12.sp, color = Color(0xFF94A3B8))
                    }
                    Spacer(Modifier.height(10.dp))
                    Text(
                        "AED ${status?.budget?.totalSpentAed ?: 0.0} spent",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black,
                        color = if ((status?.budget?.percentage ?: 0.0) >= 80) Color(0xFFEF4444) else Color(0xFF10B981)
                    )
                    Text("AED ${status?.budget?.remainingAed ?: 500.0} remaining for ${status?.budget?.currentMonth ?: ""}", fontSize = 12.sp, color = Color(0xFF94A3B8))
                }
            }

            // Quick Generation Trigger Buttons
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = { onQuickGenerate("short") },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("+ Quick Short", fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = { onQuickGenerate("long") },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED)),
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("+ Quick Long", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun VideosScreen(
    videos: List<VideoItem>,
    onRetry: (String) -> Unit,
    onPublish: (String) -> Unit
) {
    var formatFilter by remember { mutableStateOf("all") }
    val filtered = when (formatFilter) {
        "short" -> videos.filter { it.format == "short" }
        "long" -> videos.filter { it.format == "long" }
        else -> videos
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = formatFilter == "all",
                onClick = { formatFilter = "all" },
                label = { Text("All (${videos.size})") }
            )
            FilterChip(
                selected = formatFilter == "short",
                onClick = { formatFilter = "short" },
                label = { Text("Shorts") }
            )
            FilterChip(
                selected = formatFilter == "long",
                onClick = { formatFilter = "long" },
                label = { Text("Long-form") }
            )
        }

        Spacer(Modifier.height(12.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(filtered) { video ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Column(Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = if (video.format == "short") Color(0xFF2563EB) else Color(0xFF7C3AED)
                            ) {
                                Text(
                                    video.format.uppercase(),
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                            Spacer(Modifier.width(8.dp))
                            Text(
                                video.status.uppercase(),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = when (video.status) {
                                    "published" -> Color(0xFF10B981)
                                    "ready" -> Color(0xFF38BDF8)
                                    "failed" -> Color(0xFFEF4444)
                                    else -> Color(0xFFFBBF24)
                                }
                            )
                        }

                        Spacer(Modifier.height(8.dp))
                        Text(video.title, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                        Text("Duration: ${video.durationSeconds}s | Cost: AED ${video.costActualAed}", fontSize = 12.sp, color = Color(0xFF94A3B8))

                        if (video.status == "ready") {
                            Spacer(Modifier.height(10.dp))
                            Button(
                                onClick = { onPublish(video.id) },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                            ) {
                                Text("Publish to YouTube (Private)", fontWeight = FontWeight.Bold)
                            }
                        } else if (video.status == "failed") {
                            Spacer(Modifier.height(10.dp))
                            Button(
                                onClick = { onRetry(video.id) },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                            ) {
                                Text("Retry Generation", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AutomationScreen(status: SystemStatusResponse?, onToggle: (Boolean) -> Unit) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Autopilot Control", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color.White)
        Spacer(Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth().background(Color(0xFF1E293B), RoundedCornerShape(14.dp)).padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Autonomous Production", fontWeight = FontWeight.Bold, color = Color.White)
                Text("Auto-generate 40 Shorts & 20 Long monthly", fontSize = 12.sp, color = Color(0xFF94A3B8))
            }
            Switch(
                checked = status?.automationEnabled == true,
                onCheckedChange = { onToggle(it) }
            )
        }
    }
}

@Composable
fun AnalyticsScreen(status: SystemStatusResponse?) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Channel & Production Analytics", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color.White)
        Spacer(Modifier.height(16.dp))

        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)), shape = RoundedCornerShape(14.dp)) {
            Column(Modifier.padding(16.dp)) {
                Text("YouTube Subscribers", color = Color(0xFF94A3B8), fontSize = 12.sp)
                Text("${status?.youtube?.subscriberCount ?: 0}", fontSize = 26.sp, fontWeight = FontWeight.Black, color = Color.White)
                Spacer(Modifier.height(12.dp))
                Text("Total Views", color = Color(0xFF94A3B8), fontSize = 12.sp)
                Text("${status?.youtube?.viewCount ?: 0}", fontSize = 26.sp, fontWeight = FontWeight.Black, color = Color(0xFF38BDF8))
            }
        }
    }
}

@Composable
fun SettingsScreen(status: SystemStatusResponse?) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("System Settings", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color.White)
        Spacer(Modifier.height(16.dp))

        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)), shape = RoundedCornerShape(14.dp)) {
            Column(Modifier.padding(16.dp)) {
                Text("YouTube Connection", fontWeight = FontWeight.Bold, color = Color.White)
                Text(
                    if (status?.youtube?.isConnected == true) "Connected: ${status.youtube.channelTitle}"
                    else "Not Connected (Using Private Upload Mock)",
                    color = if (status?.youtube?.isConnected == true) Color(0xFF10B981) else Color(0xFFFBBF24),
                    fontSize = 13.sp
                )
                Spacer(Modifier.height(14.dp))
                Text("Backend Engine: Node.js Express + Gemini 3.8", color = Color(0xFF94A3B8), fontSize = 12.sp)
                Text("Rendering: Remotion / Headless Canvas Compositor", color = Color(0xFF94A3B8), fontSize = 12.sp)
            }
        }
    }
}
