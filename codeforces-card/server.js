const express = require("express");

const app = express();

const PORT = 3000;
const HANDLE = "utshoprogrammer";


// ==================================================
// GET SOLVED PROBLEM COUNT
// ==================================================

async function getSolvedCount(handle) {
    const response = await fetch(
        `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`
    );

    const data = await response.json();

    // Check API response
    if (data.status !== "OK") {
        throw new Error(
            "Failed to fetch Codeforces submissions"
        );
    }

    // Set automatically removes duplicate problems
    const solvedProblems = new Set();

    for (const submission of data.result) {

        // Only Accepted submissions
        if (submission.verdict === "OK") {

            const problem = submission.problem;

            // Create unique problem ID
            const problemId =
                `${problem.contestId}-${problem.index}`;

            solvedProblems.add(problemId);
        }
    }

    return solvedProblems.size;
}


// ==================================================
// HOME ROUTE
// ==================================================

app.get("/", (req, res) => {

    res.send(
        "Codeforces Card API is running!"
    );

});


// ==================================================
// CODEFORCES SVG CARD
// ==================================================

app.get("/card.svg", async (req, res) => {

    try {

        // ==============================================
        // FETCH USER INFORMATION
        // ==============================================

        const response = await fetch(
            `https://codeforces.com/api/user.info?handles=${encodeURIComponent(HANDLE)}`
        );

        const data = await response.json();


        // ==============================================
        // CHECK USER API
        // ==============================================

        if (
            data.status !== "OK" ||
            !data.result ||
            data.result.length === 0
        ) {

            return res
                .status(404)
                .send("Codeforces user not found");

        }


        // ==============================================
        // USER DATA
        // ==============================================

        const user = data.result[0];

        const handle = user.handle;

        const rating = user.rating ?? null;

        const maxRating = user.maxRating ?? null;

        const rank = user.rank ?? "unrated";


        // ==============================================
        // SOLVED PROBLEMS
        // ==============================================

        const solved = await getSolvedCount(handle);


        // ==============================================
        // DISPLAY TEXT
        // ==============================================

        const ratingText =
            rating !== null
                ? rating
                : "Unrated";


        const maxRatingText =
            maxRating !== null
                ? maxRating
                : "Unrated";


        // ==============================================
        // GENERATE SVG
        // ==============================================

        const svg = `
<svg
  width="672"
  height="406"
  viewBox="0 0 672 406"
  xmlns="http://www.w3.org/2000/svg"
>

  <!-- ====================================== -->
  <!-- MAIN CARD -->
  <!-- ====================================== -->

  <rect
    width="672"
    height="406"
    rx="24"
    fill="#20212a"
  />


  <!-- ====================================== -->
  <!-- USERNAME -->
  <!-- ====================================== -->

  <text
    x="42"
    y="70"
    fill="#ffffff"
    font-family="Arial, sans-serif"
    font-size="38"
    font-weight="700"
  >
    ${handle}
  </text>


  <!-- ====================================== -->
  <!-- RANK -->
  <!-- ====================================== -->

  <text
    x="42"
    y="110"
    fill="#c7c7c7"
    font-family="Arial, sans-serif"
    font-size="28"
    font-weight="600"
  >
    ${rank}
  </text>


  <!-- ====================================== -->
  <!-- RATING LABEL -->
  <!-- ====================================== -->

  <text
    x="42"
    y="204"
    fill="#9da8d0"
    font-family="Arial, sans-serif"
    font-size="25"
  >
    Rating
  </text>


  <!-- ====================================== -->
  <!-- RATING VALUE -->
  <!-- ====================================== -->

  <text
    x="42"
    y="260"
    fill="#ffffff"
    font-family="Arial, sans-serif"
    font-size="44"
    font-weight="700"
  >
    ${ratingText}
  </text>


  <!-- ====================================== -->
  <!-- MAX RATING LABEL -->
  <!-- ====================================== -->

  <text
    x="245"
    y="204"
    fill="#9da8d0"
    font-family="Arial, sans-serif"
    font-size="25"
  >
    Max Rating
  </text>


  <!-- ====================================== -->
  <!-- MAX RATING VALUE -->
  <!-- ====================================== -->

  <text
    x="245"
    y="260"
    fill="#ffffff"
    font-family="Arial, sans-serif"
    font-size="44"
    font-weight="700"
  >
    ${maxRatingText}
  </text>


  <!-- ====================================== -->
  <!-- SOLVED LABEL -->
  <!-- ====================================== -->

  <text
    x="470"
    y="204"
    fill="#9da8d0"
    font-family="Arial, sans-serif"
    font-size="25"
  >
    Solved
  </text>


  <!-- ====================================== -->
  <!-- SOLVED VALUE -->
  <!-- ====================================== -->

  <text
    x="470"
    y="260"
    fill="#ffffff"
    font-family="Arial, sans-serif"
    font-size="44"
    font-weight="700"
  >
    ${solved}
  </text>


  <!-- ====================================== -->
  <!-- PROGRESS BAR BACKGROUND -->
  <!-- ====================================== -->

  <rect
    x="42"
    y="304"
    width="588"
    height="13"
    rx="7"
    fill="#2d2e3d"
  />


  <!-- ====================================== -->
  <!-- PROGRESS BAR -->
  <!-- ====================================== -->

  <rect
    x="42"
    y="304"
    width="${rating !== null ? getProgressWidth(rating) : 20}"
    height="13"
    rx="7"
    fill="#dddddd"
  />


  <!-- ====================================== -->
  <!-- PROFILE URL -->
  <!-- ====================================== -->

  <text
    x="42"
    y="365"
    fill="#9da8d0"
    font-family="Arial, sans-serif"
    font-size="25"
  >
    codeforces.com/profile/${handle}
  </text>

</svg>
`;


        // ==============================================
        // SEND SVG
        // ==============================================

        res.setHeader(
            "Content-Type",
            "image/svg+xml"
        );

        res.setHeader(
            "Cache-Control",
            "no-cache"
        );

        res.send(svg);


    } catch (error) {

        console.error(
            "Error generating Codeforces card:",
            error
        );

        res
            .status(500)
            .send(
                "Failed to generate Codeforces card"
            );

    }

});


// ==================================================
// PROGRESS BAR
// ==================================================

function getProgressWidth(rating) {

    const MAX_RATING = 3000;

    const percentage =
        Math.min(
            rating / MAX_RATING,
            1
        );

    return Math.max(
        20,
        588 * percentage
    );

}


// ==================================================
// START SERVER
// ==================================================

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});