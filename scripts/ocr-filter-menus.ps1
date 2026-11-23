Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapTransform, Windows.Foundation, ContentType = WindowsRuntime]

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}

$ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$files = Get-ChildItem "d:\FoodWeb\public\images\menus\*.jpg"

$keptIds = @()
$purgedIds = @()

foreach ($f in $files) {
  $id = $f.BaseName
  $num = [int]($id -replace '\D','')

  # Official Google Drive menu boards from Excel dataset (dd0256..dd0380)
  $isExcelDrive = ($num -ge 256 -and $num -le 380)

  try {
    $sFile = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($f.FullName)) ([Windows.Storage.StorageFile])
    $stream = Await ($sFile.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $transform = New-Object Windows.Graphics.Imaging.BitmapTransform
    $scale = if ($decoder.PixelWidth -lt 1000) { 2 } else { 1 }
    $transform.ScaledWidth = $decoder.PixelWidth * $scale
    $transform.ScaledHeight = $decoder.PixelHeight * $scale
    $bitmap = Await ($decoder.GetSoftwareBitmapAsync(
      [Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,
      [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied,
      $transform,
      [Windows.Graphics.Imaging.ExifOrientationMode]::IgnoreExifOrientation,
      [Windows.Graphics.Imaging.ColorManagementMode]::DoNotColorManage
    )) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $res = Await ($ocr.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    $stream.Dispose()

    $lineCount = @($res.Lines).Count
    $text = $res.Text
    $numMatches = ([regex]::Matches($text, '\d{2,}')).Count

    if ($isExcelDrive -or ($lineCount -ge 5 -and $text.Length -ge 55 -and $numMatches -ge 2)) {
      $keptIds += $id
    } else {
      $purgedIds += $id
      Remove-Item $f.FullName -Force
    }
  } catch {
    if (-not $isExcelDrive) {
      $purgedIds += $id
      Remove-Item $f.FullName -Force
    }
  }
}

Write-Host "OCR Menu Filter complete: Kept $($keptIds.Count) verified menu boards with prices | Purged $($purgedIds.Count) food-only photos without prices."
Write-Host "Purged IDs: $($purgedIds -join ', ')"
