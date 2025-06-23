// Test script to verify Cloudflare R2 upload system
const fs = require('fs');
const path = require('path');

async function testR2Upload() {
  try {
    console.log('🧪 Testing Cloudflare R2 Upload System...\n');

    // Test 1: Health Check
    console.log('1. Testing R2 health check...');
    const healthResponse = await fetch('http://localhost:5000/api/uploads/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);

    // Test 2: File Upload
    console.log('\n2. Testing file upload to R2...');
    const testImagePath = path.join(__dirname, 'attached_assets', 'image_1750714447898.png');
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found');
      return;
    }

    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(testImagePath)], { type: 'image/png' });
    formData.append('file', fileBlob, 'test-image.png');

    const uploadResponse = await fetch('http://localhost:5000/api/uploads/upload', {
      method: 'POST',
      body: formData,
    });

    const uploadData = await uploadResponse.json();
    console.log('✅ Upload response:', uploadData);

    // Test 3: File Accessibility
    if (uploadData.success && uploadData.fileUrl) {
      console.log('\n3. Testing file accessibility...');
      try {
        const fileResponse = await fetch(uploadData.fileUrl);
        console.log('📄 File access status:', fileResponse.status);
        console.log('📄 File access headers:', Object.fromEntries(fileResponse.headers.entries()));
      } catch (error) {
        console.log('❌ File access error:', error.message);
      }
    }

    // Test 4: Delete Functionality
    if (uploadData.success && uploadData.fileUrl) {
      console.log('\n4. Testing file deletion...');
      const deleteResponse = await fetch('http://localhost:5000/api/uploads/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileUrl: uploadData.fileUrl }),
      });

      const deleteData = await deleteResponse.json();
      console.log('✅ Delete response:', deleteData);
    }

    console.log('\n🎉 R2 system tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testR2Upload();
}

module.exports = { testR2Upload };