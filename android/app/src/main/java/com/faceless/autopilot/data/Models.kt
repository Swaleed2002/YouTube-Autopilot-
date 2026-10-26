package com.faceless.autopilot.data

data class SystemStatusResponse(
    val status: String,
    val appName: String,
    val version: String,
    val emergencyStop: Boolean,
    val automationEnabled: Boolean,
    val counts: ProductionCounts,
    val budget: BudgetSummary,
    val youtube: YouTubeInfo
)

data class ProductionCounts(
    val total: Int,
    val published: Int,
    val ready: Int,
    val failed: Int,
    val activeQueued: Int,
    val shortsThisMonth: Int,
    val targetShorts: Int,
    val longThisMonth: Int,
    val targetLong: Int
)

data class BudgetSummary(
    val monthlyCeilingAed: Double,
    val totalSpentAed: Double,
    val remainingAed: Double,
    val totalSpentUsd: Double,
    val percentage: Double,
    val isSuspended: Boolean,
    val isWarning: Boolean,
    val currentMonth: String
)

data class YouTubeInfo(
    val isConnected: Boolean,
    val channelId: String?,
    val channelTitle: String?,
    val channelHandle: String?,
    val subscriberCount: Int?,
    val viewCount: Int?,
    val videoCount: Int?
)

data class VideoItem(
    val id: String,
    val title: String,
    val topic: String,
    val category: String,
    val format: String, // "short" or "long"
    val status: String,
    val currentStep: String,
    val progress: Int,
    val createdAt: String,
    val durationSeconds: Int,
    val costEstimatedAed: Double,
    val costActualAed: Double,
    val youtubeUrl: String?,
    val thumbnailUrl: String?,
    val errorMessage: String?
)

data class VideoListResponse(
    val videos: List<VideoItem>
)

data class GenerateVideoRequest(
    val format: String,
    val category: String?,
    val customTopic: String?
)

data class ToggleAutomationRequest(
    val enabled: Boolean
)

data class PublishVideoRequest(
    val privacyStatus: String = "private"
)

data class SimpleResponse(
    val success: Boolean,
    val error: String? = null
)
