/**
 * Admin Panel Enhanced Interactions
 * Professional UI/UX improvements with JavaScript
 */

// Sidebar Toggle
function toggleSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  if (sidebar) {
    sidebar.classList.toggle('active');
    // Prevent body scroll when sidebar is open
    if (sidebar.classList.contains('active')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
}

// Legacy function for backwards compatibility
function toggleMobileMenu() {
  toggleSidebar();
}

// Close sidebar when clicking outside
document.addEventListener('click', function(event) {
  const sidebar = document.getElementById('adminSidebar');
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  
  if (sidebar && sidebar.classList.contains('active')) {
    const sidebarContent = document.querySelector('.sidebar-content');
    if (!sidebarContent.contains(event.target) && !menuToggle.contains(event.target)) {
      toggleSidebar();
    }
  }
});

// Close sidebar on ESC key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar && sidebar.classList.contains('active')) {
      toggleSidebar();
    }
  }
});

// Close sidebar when window is resized to desktop (optional)
let resizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    if (window.innerWidth > 1024) {
      const sidebar = document.getElementById('adminSidebar');
      if (sidebar && sidebar.classList.contains('active')) {
        toggleSidebar();
      }
    }
  }, 250);
});

// Auto-dismiss alerts after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(function(alert) {
    // Only auto-dismiss success alerts
    if (alert.classList.contains('alert-success')) {
      setTimeout(function() {
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-10px)';
        setTimeout(function() {
          alert.remove();
        }, 300);
      }, 5000);
    }
  });
});

// Add smooth scroll behavior to anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href !== '#') {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  });
});

// Form validation enhancement
document.addEventListener('DOMContentLoaded', function() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(function(form) {
    // Add loading state on submit
    form.addEventListener('submit', function(e) {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn && !submitBtn.classList.contains('loading')) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
      }
    });
    
    // Real-time validation feedback
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(function(input) {
      input.addEventListener('blur', function() {
        if (this.hasAttribute('required') && !this.value.trim()) {
          this.style.borderColor = 'var(--danger-color)';
        } else {
          this.style.borderColor = '';
        }
      });
      
      input.addEventListener('input', function() {
        if (this.style.borderColor) {
          this.style.borderColor = '';
        }
      });
    });
  });
});

// Table row click enhancement (except for action buttons)
document.addEventListener('DOMContentLoaded', function() {
  const tableRows = document.querySelectorAll('tbody tr');
  
  tableRows.forEach(function(row) {
    row.addEventListener('click', function(e) {
      // Don't highlight if clicking on buttons or links
      if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('form')) {
        // Toggle highlight
        this.style.backgroundColor = this.style.backgroundColor ? '' : 'var(--primary-light)';
      }
    });
  });
});

// Image preview enhancement
document.addEventListener('DOMContentLoaded', function() {
  const imageInputs = document.querySelectorAll('input[name="image"], input[name="image_url"], input[name="logo_url"]');
  
  imageInputs.forEach(function(input) {
    input.addEventListener('blur', function() {
      const value = this.value.trim();
      if (value && (value.startsWith('http') || value.startsWith('/'))) {
        // Check if preview exists
        let preview = this.parentElement.nextElementSibling;
        if (!preview || !preview.classList.contains('image-preview-dynamic')) {
          preview = document.createElement('div');
          preview.className = 'form-group image-preview-dynamic';
          preview.innerHTML = `
            <label class="form-label">Preview</label>
            <div style="padding: 1rem; background: var(--gray-100); border-radius: var(--border-radius-sm); display: inline-block;">
              <img src="${value}" 
                   style="max-height: 150px; max-width: 100%; object-fit: contain;" 
                   alt="Preview"
                   onerror="this.parentElement.innerHTML='<span style=color:var(--danger-color)>❌ Failed to load image</span>'">
            </div>
          `;
          this.parentElement.parentElement.insertBefore(preview, this.parentElement.nextSibling);
        } else {
          // Update existing preview
          const img = preview.querySelector('img');
          if (img) {
            img.src = value;
          }
        }
      }
    });
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  // Ctrl/Cmd + K for search (if implemented)
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const searchInput = document.querySelector('input[type="search"]');
    if (searchInput) {
      searchInput.focus();
    }
  }
  
  // ESC to close sidebar (handled above)
});

// Copy to clipboard functionality (for IDs, links, etc.)
function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      showToast('Copied to clipboard!', 'success');
    }).catch(function() {
      fallbackCopyToClipboard(text);
    });
  } else {
    fallbackCopyToClipboard(text);
  }
}

function fallbackCopyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('Copied to clipboard!', 'success');
  } catch (err) {
    console.error('Failed to copy:', err);
  }
  document.body.removeChild(textArea);
}

// Toast notification system
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? 'var(--success-color)' : 'var(--primary-color)'};
    color: white;
    border-radius: var(--border-radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 9999;
    animation: slideInRight 0.3s ease;
    font-size: 14px;
    font-weight: 500;
    max-width: 300px;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(function() {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(function() {
      toast.remove();
    }, 300);
  }, 3000);
}

// Add animation styles for toast
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(toastStyles);

// Confirmation dialog enhancement
document.addEventListener('DOMContentLoaded', function() {
  const forms = document.querySelectorAll('form[onsubmit*="confirm"]');
  
  forms.forEach(function(form) {
    // Store original onsubmit
    const originalOnsubmit = form.onsubmit;
    
    // Replace with better confirmation dialog
    form.onsubmit = function(e) {
      e.preventDefault();
      
      const message = form.getAttribute('onsubmit').match(/confirm\(['"](.+)['"]\)/)?.[1] || 'Are you sure?';
      
      if (confirm(message)) {
        // Remove the onsubmit to prevent infinite loop
        form.onsubmit = null;
        form.submit();
      }
      
      return false;
    };
  });
});

// Lazy load images
document.addEventListener('DOMContentLoaded', function() {
  const images = document.querySelectorAll('img[data-src]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver(function(entries, observer) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });
    
    images.forEach(function(img) {
      imageObserver.observe(img);
    });
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    images.forEach(function(img) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
});

// Print functionality
function printPage() {
  window.print();
}

// Export table to CSV (basic implementation)
function exportTableToCSV(tableId, filename = 'export.csv') {
  const table = document.getElementById(tableId) || document.querySelector('table');
  if (!table) return;
  
  let csv = [];
  const rows = table.querySelectorAll('tr');
  
  rows.forEach(function(row) {
    const cols = row.querySelectorAll('td, th');
    const csvRow = [];
    cols.forEach(function(col) {
      csvRow.push('"' + col.textContent.trim().replace(/"/g, '""') + '"');
    });
    csv.push(csvRow.join(','));
  });
  
  const csvString = csv.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
  
  showToast('Table exported successfully!', 'success');
}

// Session timeout warning (optional - 30 minutes)
let sessionTimeout;
let sessionWarning;

function resetSessionTimer() {
  clearTimeout(sessionTimeout);
  clearTimeout(sessionWarning);
  
  // Warn at 28 minutes
  sessionWarning = setTimeout(function() {
    if (confirm('Your session will expire in 2 minutes. Click OK to stay logged in.')) {
      // Send keepalive request
      fetch('/admin/keepalive', { method: 'POST' }).catch(function() {});
      resetSessionTimer();
    }
  }, 28 * 60 * 1000);
  
  // Logout at 30 minutes
  sessionTimeout = setTimeout(function() {
    alert('Your session has expired. You will be redirected to login.');
    window.location.href = '/admin/login';
  }, 30 * 60 * 1000);
}

// Reset timer on user activity
document.addEventListener('mousemove', resetSessionTimer);
document.addEventListener('keypress', resetSessionTimer);
document.addEventListener('click', resetSessionTimer);
document.addEventListener('scroll', resetSessionTimer);

// Initialize session timer
if (window.location.pathname.startsWith('/admin/') && !window.location.pathname.includes('/login')) {
  resetSessionTimer();
}

console.log('✨ Admin Panel Enhanced - UI/UX improvements loaded successfully!');
