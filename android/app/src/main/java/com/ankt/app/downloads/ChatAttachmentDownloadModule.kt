package com.ankt.app.downloads

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.util.concurrent.Executors

class ChatAttachmentDownloadModule(
  private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
  private val executor = Executors.newCachedThreadPool()

  override fun getName() = "ChatAttachmentDownloader"

  @ReactMethod
  fun download(url: String, fileName: String, promise: Promise) {
    if (!url.startsWith("https://") && !url.startsWith("http://")) {
      promise.reject("INVALID_URL", "Tệp này chưa sẵn sàng để tải xuống.")
      return
    }

    val safeFileName = File(fileName).name.takeIf { it.isNotBlank() }
    if (safeFileName == null) {
      promise.reject("INVALID_FILE_NAME", "Tên tệp không hợp lệ.")
      return
    }

    try {
      val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
      val request = DownloadManager.Request(Uri.parse(url))
        .setTitle(safeFileName)
        .setDescription("Đang tải xuống")
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setAllowedOverMetered(true)
        .setAllowedOverRoaming(true)
        .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, safeFileName)
      val downloadId = manager.enqueue(request)
      executor.execute { awaitDownload(manager, downloadId, promise) }
    } catch (error: Exception) {
      promise.reject("DOWNLOAD_START_FAILED", "Không thể bắt đầu tải tệp.", error)
    }
  }

  private fun awaitDownload(manager: DownloadManager, downloadId: Long, promise: Promise) {
    try {
      while (!Thread.currentThread().isInterrupted) {
        manager.query(DownloadManager.Query().setFilterById(downloadId)).use { cursor ->
          if (!cursor.moveToFirst()) {
            promise.reject("DOWNLOAD_NOT_FOUND", "Không tìm thấy tiến trình tải tệp.")
            return
          }

          when (cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))) {
            DownloadManager.STATUS_SUCCESSFUL -> {
              promise.resolve(null)
              return
            }
            DownloadManager.STATUS_FAILED -> {
              val reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))
              promise.reject("DOWNLOAD_FAILED", "Tải tệp thất bại (mã $reason).")
              return
            }
          }
        }
        Thread.sleep(POLL_INTERVAL_MS)
      }
    } catch (error: InterruptedException) {
      Thread.currentThread().interrupt()
      promise.reject("DOWNLOAD_INTERRUPTED", "Quá trình tải tệp đã bị gián đoạn.", error)
    } catch (error: Exception) {
      promise.reject("DOWNLOAD_FAILED", "Không thể tải tệp.", error)
    }
  }

  override fun invalidate() {
    executor.shutdownNow()
    super.invalidate()
  }

  companion object {
    private const val POLL_INTERVAL_MS = 300L
  }
}
