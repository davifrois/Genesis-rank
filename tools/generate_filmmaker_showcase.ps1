Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

function New-RoundedRectPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2

  if ($Radius -le 0) {
    $path.AddRectangle([System.Drawing.RectangleF]::new($X, $Y, $Width, $Height))
    return $path
  }

  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-ImageCover {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Image]$Image,
    [System.Drawing.RectangleF]$Destination,
    [float]$Opacity = 1
  )

  $srcW = [float]$Image.Width
  $srcH = [float]$Image.Height
  $destW = [float]$Destination.Width
  $destH = [float]$Destination.Height
  $srcRatio = $srcW / $srcH
  $destRatio = $destW / $destH

  if ($srcRatio -gt $destRatio) {
    $cropH = $srcH
    $cropW = $cropH * $destRatio
    $srcX = ($srcW - $cropW) / 2
    $srcY = 0
  } else {
    $cropW = $srcW
    $cropH = $cropW / $destRatio
    $srcX = 0
    $srcY = ($srcH - $cropH) / 2
  }

  $matrix = New-Object System.Drawing.Imaging.ColorMatrix
  $matrix.Matrix33 = [Math]::Min([Math]::Max($Opacity, 0), 1)
  $attributes = New-Object System.Drawing.Imaging.ImageAttributes
  $attributes.SetColorMatrix($matrix, [System.Drawing.Imaging.ColorMatrixFlag]::Default, [System.Drawing.Imaging.ColorAdjustType]::Bitmap)

  $Graphics.DrawImage(
    $Image,
    [System.Drawing.Rectangle]::Round($Destination),
    [float]$srcX,
    [float]$srcY,
    [float]$cropW,
    [float]$cropH,
    [System.Drawing.GraphicsUnit]::Pixel,
    $attributes
  )

  $attributes.Dispose()
}

function Fill-RoundedRect {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Brush]$Brush,
    [System.Drawing.RectangleF]$Rect,
    [float]$Radius
  )

  $path = New-RoundedRectPath -X $Rect.X -Y $Rect.Y -Width $Rect.Width -Height $Rect.Height -Radius $Radius
  $Graphics.FillPath($Brush, $path)
  $path.Dispose()
}

function Draw-RoundedBorder {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Pen]$Pen,
    [System.Drawing.RectangleF]$Rect,
    [float]$Radius
  )

  $path = New-RoundedRectPath -X $Rect.X -Y $Rect.Y -Width $Rect.Width -Height $Rect.Height -Radius $Radius
  $Graphics.DrawPath($Pen, $path)
  $path.Dispose()
}

function Draw-Card {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.RectangleF]$Rect,
    [System.Drawing.Image]$BaseImage,
    [string]$Title,
    [string]$Subtitle = '',
    [bool]$LargeTitle = $false,
    [System.Drawing.Image]$OverlayImage = $null,
    [float]$OverlayOpacity = 0.24
  )

  $shadowRect = [System.Drawing.RectangleF]::new($Rect.X + 4, $Rect.Y + 8, $Rect.Width, $Rect.Height)
  $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(68, 2, 6, 16))
  Fill-RoundedRect -Graphics $Graphics -Brush $shadowBrush -Rect $shadowRect -Radius 18
  $shadowBrush.Dispose()

  $cardPath = New-RoundedRectPath -X $Rect.X -Y $Rect.Y -Width $Rect.Width -Height $Rect.Height -Radius 18
  $Graphics.SetClip($cardPath)
  Draw-ImageCover -Graphics $Graphics -Image $BaseImage -Destination $Rect
  if ($OverlayImage -ne $null) {
    Draw-ImageCover -Graphics $Graphics -Image $OverlayImage -Destination $Rect -Opacity $OverlayOpacity
  }

  $topFade = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.PointF]::new($Rect.X, $Rect.Y),
    [System.Drawing.PointF]::new($Rect.X, $Rect.Y + $Rect.Height),
    [System.Drawing.Color]::FromArgb(52, 255, 255, 255),
    [System.Drawing.Color]::FromArgb(186, 3, 7, 14)
  )
  $Graphics.FillRectangle($topFade, $Rect)
  $topFade.Dispose()

  $sideFade = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.PointF]::new($Rect.X, $Rect.Y),
    [System.Drawing.PointF]::new($Rect.X + $Rect.Width, $Rect.Y),
    [System.Drawing.Color]::FromArgb(118, 8, 16, 30),
    [System.Drawing.Color]::FromArgb(36, 8, 16, 30)
  )
  $Graphics.FillRectangle($sideFade, $Rect)
  $sideFade.Dispose()
  $Graphics.ResetClip()

  $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(95, 181, 208, 246), 1.4)
  Draw-RoundedBorder -Graphics $Graphics -Pen $borderPen -Rect $Rect -Radius 18
  $borderPen.Dispose()
  $cardPath.Dispose()

  $playOuter = [System.Drawing.RectangleF]::new($Rect.X + 18, $Rect.Y + 18, 54, 54)
  $playBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(92, 255, 255, 255))
  $Graphics.FillEllipse($playBrush, $playOuter)
  $playBrush.Dispose()
  $playBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(76, 255, 255, 255), 1)
  $Graphics.DrawEllipse($playBorder, $playOuter)
  $playBorder.Dispose()

  $triangleBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(212, 255, 255, 255))
  $triangle = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($Rect.X + 40, $Rect.Y + 33),
    [System.Drawing.PointF]::new($Rect.X + 40, $Rect.Y + 57),
    [System.Drawing.PointF]::new($Rect.X + 60, $Rect.Y + 45)
  )
  $Graphics.FillPolygon($triangleBrush, $triangle)
  $triangleBrush.Dispose()

  $titleFont = if ($LargeTitle) {
    New-Object System.Drawing.Font('Segoe UI', 22, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  } else {
    New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  }
  $subtitleFont = New-Object System.Drawing.Font('Segoe UI', 9.5, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $whiteBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(244, 249, 255))
  $mutedBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(204, 215, 230))

  $titleRect = if ($LargeTitle) {
    [System.Drawing.RectangleF]::new($Rect.X + 18, $Rect.Bottom - 112, $Rect.Width - 36, 74)
  } else {
    [System.Drawing.RectangleF]::new($Rect.X + 18, $Rect.Bottom - 72, $Rect.Width - 36, 40)
  }
  $subtitleRect = [System.Drawing.RectangleF]::new($Rect.X + 18, $Rect.Bottom - 32, $Rect.Width - 36, 22)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Near
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Near

  $Graphics.DrawString($Title, $titleFont, $whiteBrush, $titleRect, $fmt)
  if ($Subtitle) {
    $Graphics.DrawString($Subtitle, $subtitleFont, $mutedBrush, $subtitleRect, $fmt)
  }

  $badgeRect = [System.Drawing.RectangleF]::new($Rect.Right - 156, $Rect.Y + 16, 138, 28)
  $badgeBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(116, 5, 12, 22))
  Fill-RoundedRect -Graphics $Graphics -Brush $badgeBrush -Rect $badgeRect -Radius 14
  $badgeBrush.Dispose()
  $badgePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 203, 222, 248), 1)
  Draw-RoundedBorder -Graphics $Graphics -Pen $badgePen -Rect $badgeRect -Radius 14
  $badgePen.Dispose()

  $badgeFont = New-Object System.Drawing.Font('Segoe UI', 8.2, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $Graphics.DrawString('@genesis_filmaker', $badgeFont, $whiteBrush, [System.Drawing.PointF]::new($badgeRect.X + 14, $badgeRect.Y + 7))

  $titleFont.Dispose()
  $subtitleFont.Dispose()
  $badgeFont.Dispose()
  $whiteBrush.Dispose()
  $mutedBrush.Dispose()
  $fmt.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $root 'img\filmmaker-showcase.png'

$photographer = [System.Drawing.Image]::FromFile('C:\Users\Dfrois\Desktop\7fa46870-6b20-4b66-99a9-dd680a31035d.jfif')
$venue = [System.Drawing.Image]::FromFile('C:\Users\Dfrois\Desktop\unnamed.jpg')
$athleteBlue = [System.Drawing.Image]::FromFile('C:\Users\Dfrois\Desktop\unnamed (1).jpg')
$medal = [System.Drawing.Image]::FromFile('C:\Users\Dfrois\Desktop\unnamed (2).jpg')
$champion = [System.Drawing.Image]::FromFile('C:\Users\Dfrois\Desktop\unnamed (3).jpg')
$logo = [System.Drawing.Image]::FromFile((Join-Path $root 'public\genesis-logo.png'))

$canvasWidth = 1408
$canvasHeight = 768
$bitmap = New-Object System.Drawing.Bitmap($canvasWidth, $canvasHeight)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$graphics.Clear([System.Drawing.Color]::FromArgb(6, 10, 18))

$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  [System.Drawing.PointF]::new(0, 0),
  [System.Drawing.PointF]::new($canvasWidth, $canvasHeight),
  [System.Drawing.Color]::FromArgb(8, 12, 20),
  [System.Drawing.Color]::FromArgb(10, 18, 31)
)
$graphics.FillRectangle($bgBrush, 0, 0, $canvasWidth, $canvasHeight)
$bgBrush.Dispose()

$glowBrushLeft = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(36, 47, 126, 255))
$graphics.FillEllipse($glowBrushLeft, -140, 150, 420, 420)
$glowBrushLeft.Dispose()
$glowBrushRight = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(28, 125, 177, 255))
$graphics.FillEllipse($glowBrushRight, 1060, -80, 360, 420)
$glowBrushRight.Dispose()

$frameRect = [System.Drawing.RectangleF]::new(308, 58, 780, 616)
$frameShadow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(78, 2, 6, 14))
Fill-RoundedRect -Graphics $graphics -Brush $frameShadow -Rect ([System.Drawing.RectangleF]::new($frameRect.X + 8, $frameRect.Y + 10, $frameRect.Width, $frameRect.Height)) -Radius 24
$frameShadow.Dispose()
$frameBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  [System.Drawing.PointF]::new($frameRect.X, $frameRect.Y),
  [System.Drawing.PointF]::new($frameRect.Right, $frameRect.Bottom),
  [System.Drawing.Color]::FromArgb(20, 32, 54),
  [System.Drawing.Color]::FromArgb(11, 18, 32)
)
Fill-RoundedRect -Graphics $graphics -Brush $frameBrush -Rect $frameRect -Radius 24
$frameBrush.Dispose()
$framePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(62, 163, 190, 228), 1.2)
Draw-RoundedBorder -Graphics $graphics -Pen $framePen -Rect $frameRect -Radius 24
$framePen.Dispose()

$headerPillRect = [System.Drawing.RectangleF]::new(492, 82, 146, 26)
$pillBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(58, 9, 17, 31))
Fill-RoundedRect -Graphics $graphics -Brush $pillBrush -Rect $headerPillRect -Radius 13
$pillBrush.Dispose()
$pillPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 146, 189, 244), 1)
Draw-RoundedBorder -Graphics $graphics -Pen $pillPen -Rect $headerPillRect -Radius 13
$pillPen.Dispose()

$smallCaps = New-Object System.Drawing.Font('Segoe UI', 8.4, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$titleFont = New-Object System.Drawing.Font('Arial', 30, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$subtitleFont = New-Object System.Drawing.Font('Segoe UI', 10.6, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$mutedBigFont = New-Object System.Drawing.Font('Segoe UI', 8.6, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$whiteBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(248, 251, 255))
$mutedBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(196, 209, 224))
$mutedCapsBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(120, 198, 210, 228))

$graphics.DrawString('GENESIS FILMMAKER', $smallCaps, $whiteBrush, [System.Drawing.PointF]::new($headerPillRect.X + 12, $headerPillRect.Y + 6))
$graphics.DrawString("GENESIS FILMMAKER`n| PORTFOLIO", $titleFont, $whiteBrush, [System.Drawing.RectangleF]::new(408, 108, 560, 90))
$graphics.DrawString('Sua jornada no tatame merece ser imortalizada.', $subtitleFont, $mutedBrush, [System.Drawing.PointF]::new(474, 194))
$graphics.DrawString('DIVULGUE SEU TRABALHO E CONTRATE PROFISSIONAIS', $mutedBigFont, $mutedCapsBrush, [System.Drawing.PointF]::new(438, 224))

$heroRect = [System.Drawing.RectangleF]::new(330, 252, 508, 282)
$entryRect = [System.Drawing.RectangleF]::new(852, 252, 214, 124)
$fightRect = [System.Drawing.RectangleF]::new(852, 390, 214, 124)
$athleteRect = [System.Drawing.RectangleF]::new(330, 548, 246, 104)
$academyRect = [System.Drawing.RectangleF]::new(592, 548, 246, 104)
$ctaRect = [System.Drawing.RectangleF]::new(852, 548, 214, 104)

Draw-Card -Graphics $graphics -Rect $heroRect -BaseImage $photographer -OverlayImage $venue -OverlayOpacity 0.12 -Title 'AFTERMOVIES DE EVENTOS' -Subtitle 'REGISTRO EPICO DAS COMPETICOES' -LargeTitle $true
Draw-Card -Graphics $graphics -Rect $entryRect -BaseImage $athleteBlue -Title 'VIDEOS DE ENTRADA'
Draw-Card -Graphics $graphics -Rect $fightRect -BaseImage $champion -Title 'HIGHLIGHTS DE LUTA'
Draw-Card -Graphics $graphics -Rect $athleteRect -BaseImage $athleteBlue -OverlayImage $medal -OverlayOpacity 0.22 -Title 'PERFIL DE ATLETA'
Draw-Card -Graphics $graphics -Rect $academyRect -BaseImage $venue -OverlayImage $medal -OverlayOpacity 0.14 -Title 'VIDEOS PARA ACADEMIAS'

$ctaShadow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(78, 2, 6, 18))
Fill-RoundedRect -Graphics $graphics -Brush $ctaShadow -Rect ([System.Drawing.RectangleF]::new($ctaRect.X + 4, $ctaRect.Y + 8, $ctaRect.Width, $ctaRect.Height)) -Radius 18
$ctaShadow.Dispose()
$ctaPanelBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  [System.Drawing.PointF]::new($ctaRect.X, $ctaRect.Y),
  [System.Drawing.PointF]::new($ctaRect.X, $ctaRect.Bottom),
  [System.Drawing.Color]::FromArgb(12, 22, 38),
  [System.Drawing.Color]::FromArgb(8, 14, 24)
)
Fill-RoundedRect -Graphics $graphics -Brush $ctaPanelBrush -Rect $ctaRect -Radius 18
$ctaPanelBrush.Dispose()
$ctaPanelPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(66, 155, 189, 244), 1.2)
Draw-RoundedBorder -Graphics $graphics -Pen $ctaPanelPen -Rect $ctaRect -Radius 18
$ctaPanelPen.Dispose()

$buttonRect = [System.Drawing.RectangleF]::new($ctaRect.X + 16, $ctaRect.Y + 18, $ctaRect.Width - 32, 54)
$buttonBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  [System.Drawing.PointF]::new($buttonRect.X, $buttonRect.Y),
  [System.Drawing.PointF]::new($buttonRect.X, $buttonRect.Bottom),
  [System.Drawing.Color]::FromArgb(68, 167, 255),
  [System.Drawing.Color]::FromArgb(20, 128, 255)
)
Fill-RoundedRect -Graphics $graphics -Brush $buttonBrush -Rect $buttonRect -Radius 14
$buttonBrush.Dispose()
$buttonPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(72, 201, 228, 255), 1)
Draw-RoundedBorder -Graphics $graphics -Pen $buttonPen -Rect $buttonRect -Radius 14
$buttonPen.Dispose()

$buttonFont = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$creditFont = New-Object System.Drawing.Font('Segoe UI', 8.6, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$graphics.DrawString("SOLICITAR ORCAMENTO`nVIA WHATSAPP", $buttonFont, $whiteBrush, [System.Drawing.RectangleF]::new($buttonRect.X + 8, $buttonRect.Y + 9, $buttonRect.Width - 16, 42))
$creditBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(212, 223, 241))
$graphics.DrawString('Filmado por @genesis_filmaker', $creditFont, $creditBrush, [System.Drawing.PointF]::new($ctaRect.X + 42, $ctaRect.Bottom - 24))
$creditBrush.Dispose()

$logoRect = [System.Drawing.RectangleF]::new($heroRect.Right - 116, $heroRect.Bottom - 44, 28, 28)
$graphics.DrawImage($logo, [System.Drawing.Rectangle]::Round($logoRect))
$graphics.DrawImage($logo, [System.Drawing.Rectangle]::Round([System.Drawing.RectangleF]::new($heroRect.Right - 78, $heroRect.Bottom - 44, 28, 28)))

$sparkPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(65, 255, 255, 255), 1.2)
for ($i = 0; $i -lt 22; $i++) {
  $x = 360 + (($i * 41) % 468)
  $y = 270 + (($i * 57) % 240)
  $size = if ($i % 3 -eq 0) { 3 } elseif ($i % 3 -eq 1) { 2 } else { 1.5 }
  $graphics.DrawEllipse($sparkPen, $x, $y, $size, $size)
}
$sparkPen.Dispose()

$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$smallCaps.Dispose()
$titleFont.Dispose()
$subtitleFont.Dispose()
$mutedBigFont.Dispose()
$whiteBrush.Dispose()
$mutedBrush.Dispose()
$mutedCapsBrush.Dispose()
$buttonFont.Dispose()
$creditFont.Dispose()

$graphics.Dispose()
$bitmap.Dispose()
$photographer.Dispose()
$venue.Dispose()
$athleteBlue.Dispose()
$medal.Dispose()
$champion.Dispose()
$logo.Dispose()

Write-Output "Saved $outputPath"
