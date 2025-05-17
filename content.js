console.log('[EXIF Viewer] Content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showExif") {
    let img = document.querySelector(`img[src="${request.imgSrc}"]`);
    if (!img) {
      const decodedSrc = decodeURIComponent(request.imgSrc);
      img = document.querySelector(`img[src="${decodedSrc}"]`);
    }
    if (!img) {
      const imgElements = document.getElementsByTagName('img');
      const srcEnd = request.imgSrc.split('/').pop();
      img = Array.from(imgElements).find(img => img.src.endsWith(srcEnd));
    }
    if (img) {
      showExifTooltip(img);
    } else {
      console.error('[EXIF Viewer] Image not found:', request.imgSrc);
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('[EXIF Viewer] DOM loaded, scanning for images');
  const images = document.getElementsByTagName('img');
  console.log(`[EXIF Viewer] Found ${images.length} images`);
  for (let img of images) {
    try {
      console.log('[EXIF Viewer] Found image:', img.src);
    } catch (error) {
      console.error('[EXIF Viewer] Error processing image:', error);
    }
  }
});

function showExifTooltip(img) {
  try {
    const existingTooltips = document.querySelectorAll('[id^="exif-tooltip-"]');
    existingTooltips.forEach(t => t.remove());
    fetch(img.src, {
      mode: 'cors',
      credentials: 'same-origin'
    })
      .then(response => response.blob())
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        const newImg = new Image();
        newImg.onload = function() {
          EXIF.getData(this, function() {
            const data = EXIF.getAllTags(this);
            if (Object.keys(data).length > 0) {
              createTooltip(data, img);
            } else {
              createTooltip({ "Info": chrome.i18n.getMessage("infoNoExifFound") }, img);
            }
          });
        };
        newImg.onerror = function() {
          console.error('[EXIF Viewer] Error loading image');
          createTooltip({ "Error": chrome.i18n.getMessage("errorLoadingImage") }, img);
        };
        newImg.src = objectUrl;
      })
      .catch(error => {
        console.error('[EXIF Viewer] Error fetching image:', error);
        createTooltip({ "Error": chrome.i18n.getMessage("errorAccessingImage") }, img);
      });
  } catch (error) {
    console.error('[EXIF Viewer] Error showing tooltip:', error);
  }
}

function createTooltip(data, img) {
  let tooltip = document.createElement('div');
  tooltip.id = getTooltipId(img);
  tooltip.style.cssText = `
        position: fixed;
        background-color: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        max-width: 400px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        z-index: 1000000;
    `;
  const formattedData = Object.entries(data)
    .filter(([key]) => key !== '_raw')
    .map(([key, value]) => {
      let label = key.replace(/([A-Z])/g, ' $1').trim();
      
      label = label.replace(/G P S/, 'GPS');
      
      return `<div style="margin-bottom: 4px;">
                <strong>${label}:</strong> ${value}
            </div>`;
    });
  tooltip.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <strong>${chrome.i18n.getMessage("exifDataTitle")}</strong>
            <div class="exif-close-btn" style="
                cursor: pointer;
                color: #999;
                font-size: 24px;
                padding: 5px 10px;
                margin: -5px -10px;
                user-select: none;
            ">×</div>
        </div>
        <div style="line-height: 1.5;">
            ${formattedData.length ? formattedData.join('') : chrome.i18n.getMessage("noExifData")}
        </div>
    `;
  document.body.appendChild(tooltip);
  const closeBtn = tooltip.querySelector('.exif-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => tooltip.remove());
  }
  document.addEventListener('click', function closeOutside(e) {
    if (!tooltip.contains(e.target) && e.target !== img) {
      tooltip.remove();
      document.removeEventListener('click', closeOutside);
    }
  });
  document.addEventListener('keydown', function escapeHandler(e) {
    if (e.key === 'Escape') {
      tooltip.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  });
  const rect = img.getBoundingClientRect();
  const padding = 10;
  tooltip.style.left = Math.min(
    Math.max(rect.left, padding),
    window.innerWidth - tooltip.offsetWidth - padding
  ) + 'px';
  tooltip.style.top = Math.min(
    Math.max(rect.top, padding),
    window.innerHeight - tooltip.offsetHeight - padding
  ) + 'px';
}

function getTooltipId(img) {
  return 'exif-tooltip-' + (img.src || img.dataset.id);
}
