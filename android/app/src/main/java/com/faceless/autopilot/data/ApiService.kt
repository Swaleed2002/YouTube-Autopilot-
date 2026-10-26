package com.faceless.autopilot.data

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

interface ApiService {
    @GET("api/status")
    suspend fun getStatus(): SystemStatusResponse

    @GET("api/videos")
    suspend fun getVideos(
        @Query("format") format: String? = null,
        @Query("status") status: String? = null
    ): VideoListResponse

    @POST("api/videos/generate")
    suspend fun generateVideo(@Body req: GenerateVideoRequest): SimpleResponse

    @POST("api/videos/{id}/retry")
    suspend fun retryVideo(@Path("id") id: String): SimpleResponse

    @POST("api/videos/{id}/publish")
    suspend fun publishVideo(
        @Path("id") id: String,
        @Body req: PublishVideoRequest = PublishVideoRequest()
    ): SimpleResponse

    @POST("api/automation/toggle")
    suspend fun toggleAutomation(@Body req: ToggleAutomationRequest): SimpleResponse

    @POST("api/automation/emergency-stop")
    suspend fun triggerEmergencyStop(): SimpleResponse

    @POST("api/automation/resume")
    suspend fun resumeFromEmergencyStop(): SimpleResponse
}

object NetworkClient {
    // Default points to cloud backend instance
    private var baseUrl: String = "https://ais-dev-kzut2rgveeovuxm32qkcji-150148597949.europe-west3.run.app/"

    fun setServerUrl(url: String) {
        baseUrl = if (url.endsWith("/")) url else "$url/"
        retrofitInstance = null
    }

    private var retrofitInstance: Retrofit? = null

    val api: ApiService
        get() {
            if (retrofitInstance == null) {
                retrofitInstance = Retrofit.Builder()
                    .baseUrl(baseUrl)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build()
            }
            return retrofitInstance!!.create(ApiService::class.java)
        }
}
