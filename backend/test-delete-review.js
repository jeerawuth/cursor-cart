const axios = require('axios');

// Replace with a valid admin token from your application
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN_HERE';
const REVIEW_ID_TO_DELETE = 3; // Replace with the ID of the review you want to delete

async function testDeleteReview() {
  try {
    console.log('Testing delete review API...');
    console.log(`Deleting review with ID: ${REVIEW_ID_TO_DELETE}`);
    
    const response = await axios.delete(
      `http://localhost:4000/api/reviews/${REVIEW_ID_TO_DELETE}`,
      {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        },
        // Don't throw on HTTP error status codes
        validateStatus: () => true
      }
    );

    console.log('\n--- Response ---');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.status >= 400) {
      console.error('\n❌ Error:', response.data.error || 'Unknown error');
      if (response.data.details) {
        console.error('Details:', response.data.details);
      }
    } else {
      console.log('\n✅ Success!');
    }
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
    console.error('Stack:', error.stack);
  }
}

testDeleteReview();
