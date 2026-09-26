async function testOptions() {
  try {
    const res = await fetch("http://localhost:3000/api/webauthn/authenticate/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response Body:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testOptions();
