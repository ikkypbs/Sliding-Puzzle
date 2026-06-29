# PuzzleCam — Gesture Capture

Aplikasi bilik foto (*photobooth*) interaktif yang dikendalikan menggunakan gerakan tangan (*hand gestures*) dan berjalan sepenuhnya di peramban (browser). Tanpa instalasi, tanpa backend, dan tanpa dependensi tambahan yang perlu dipasang secara manual.

---

## **DESKRIPSI**

**PuzzleCam** menangkap foto pengguna menggunakan tangan sebagai "bingkai" (frame), lalu mengubahnya menjadi game puzzle geser (*sliding puzzle*) ukuran 3x3 dengan efek filter foto hitam putih yang estetis. Pengguna dapat menyusun kembali potongan puzzle tersebut menggunakan gerakan mencubit (*pinch gesture*). Setelah puzzle berhasil diselesaikan, hasilnya akan tersimpan secara otomatis ke dalam galeri riwayat foto (*strip*) yang bisa diunduh secara langsung.

---

## **PERSYARATAN SISTEM**

- **Peramban (Browser):** Chrome atau Edge (sangat direkomendasikan), Firefox.
- **Perangkat Keras:** Kamera web (Webcam).
- **Koneksi Internet:** Diperlukan untuk memuat model MediaPipe (~10MB, hanya pada pemuatan pertama kali).
- **Server Lokal:** Diperlukan untuk menjalankan aplikasi (tidak bisa dibuka langsung sebagai file dari explorer karena kebijakan keamanan browser).

---

## **INSTALASI DAN KONFIGURASI**

### 1. Klon Repositori

```bash
git clone [https://github.com/ikkypbs/Sliding-Puzzle.git](https://github.com/ikkypbs/Sliding-Puzzle.git)
cd Sliding-Puzzle
