document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file');
  const subjectInput = document.getElementById('subject');
  const bodyInput = document.getElementById('body');
  const sendButton = document.getElementById('send');
  const uploadStatus = document.getElementById('upload-status');
  const emailListContainer = document.getElementById('email-list').querySelector('ul');
  const notification = document.getElementById('notification');

  const senderNameInput = document.getElementById('sender-name');
  const senderEmailInput = document.getElementById('sender-email');
  const manualEmailInput = document.getElementById('manual-email');
  const addEmailButton = document.getElementById('add-email');

  let extractedEmails = [];

  function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    setTimeout(() => (notification.style.display = 'none'), 5000);
  }

  // File upload handler
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showNotification('Please upload a PDF file', 'error');
      return;
    }

    uploadStatus.textContent = 'Processing file...';
    uploadStatus.style.display = 'block';

    const formData = new FormData();
    formData.append('file', file);

    try {
      emailListContainer.innerHTML = '';
      extractedEmails = [];

      const response = await fetch('/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');

      extractedEmails = [...new Set([...extractedEmails, ...data.emails])];

      if (extractedEmails.length > 0) {
        extractedEmails.forEach(email => {
          const li = document.createElement('li');
          li.textContent = email;
          emailListContainer.appendChild(li);
        });
        document.getElementById('email-list').classList.remove('hidden');
        uploadStatus.textContent = `Found ${data.emails.length} emails from PDF`;
        showNotification(`Extracted ${data.emails.length} emails from PDF`, 'success');
      } else {
        uploadStatus.textContent = 'No emails found';
        showNotification('No emails found', 'warning');
      }
    } catch (error) {
      uploadStatus.textContent = `Error: ${error.message}`;
      showNotification(`Error: ${error.message}`, 'error');
    }
  });

  // Manual email addition handler
  addEmailButton.addEventListener('click', () => {
    const email = manualEmailInput.value.trim();
    if (!email) {
      showNotification('Please enter an email address', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showNotification('Invalid email address', 'error');
      return;
    }

    if (extractedEmails.includes(email)) {
      showNotification('Email already added', 'warning');
      manualEmailInput.value = '';
      return;
    }

    extractedEmails.push(email);
    const li = document.createElement('li');
    li.textContent = email;
    emailListContainer.appendChild(li);
    showNotification('Email added successfully', 'success');
    manualEmailInput.value = '';
    document.getElementById('email-list').classList.remove('hidden');
    sendButton.disabled = false;
  });

  // Email sending handler
  sendButton.addEventListener('click', async () => {
    const subject = subjectInput.value.trim();
    const body = bodyInput.value.trim();
    const senderName = senderNameInput.value.trim();
    const senderEmail = senderEmailInput.value.trim() || '';

    if (!subject || !body) {
      showNotification('Subject and body are required', 'error');
      return;
    }
    if (extractedEmails.length === 0) {
      showNotification('No recipient emails to send', 'error');
      return;
    }
    if (!senderName) {
      showNotification('Please enter your name', 'error');
      return;
    }
    // Optional: Validate senderEmail if provided
    if (senderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      showNotification('Invalid sender email address', 'error');
      return;
    }

    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    for (const email of extractedEmails) {
      try {
        const response = await fetch('/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, body, email, senderName, senderEmail }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Sending failed');
        }
      } catch (error) {
        console.error(`Error sending to ${email}: ${error.message}`);
      }
    }

    showNotification('Emails sent successfully!', 'success');
    sendButton.disabled = false;
    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send Emails';
  });
});
