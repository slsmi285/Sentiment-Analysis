// Today's date (weekday, month, day, year)
var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
var today  = new Date();


document.getElementById("today").innerHTML = today.toLocaleDateString("en-US", options);

// API KEYS ==================================================================
var NYTtopStoriesAPIKeyJZ = "RWfhB4SgHGOUTaVyo2DRZJlCqM7fb9iW"
var microsoftAPIKeyJZ = "35cd207dc1msh4b912cdb51003fdp1d33f2jsnedb92f96eb4c"

//============================================================================

// Global Variables
var headlines = []
var favoriteHeadlines = []
var searchTerm = ""


$(document).ready(updateFavorites);

// ONCLICK FUNCTION FOR SEARCH

$("#run-search").on("click", function(event){
    event.preventDefault();
    var searchTerm = $("#search-term").val().trim()
    console.log("Search Term: " + searchTerm)

    $("#article-section").empty();
    var topStoriesQueryURL = "https://api.nytimes.com/svc/topstories/v2/"

    var articleMax = $("#article-max").val();
    console.log(articleMax)
    var category = $("#article-category").val() 

    topStoriesQueryURL += category + ".json?api-key=" + NYTtopStoriesAPIKeyJZ
    
    // AJAX call to NYT

    $.ajax({
        url: topStoriesQueryURL,
        method: "GET"
    }).then(function(results) {
        console.log(results)
        

        var articleResults = results.results
        var articleCount = results.num_results
        var articleMaxCounter = 0
        var dataString = "{  \"documents\": [{ "

        headlines = []
        
        if (!articleMax) {
            articleMax = results.num_results
        }
    
        // This for loop does 2 things:

        for (var i=0; i < articleCount; i++) {
            
            // 1. Adds the headline to the headlines array, and gives that headline a value.  


            var newObject = {
                title: articleResults[i].title,
                url: articleResults[i].short_url
            }

            lowerCaseTitle = articleResults[i].title.toLowerCase()
            console.log(lowerCaseTitle)
            lowerCaseSearchTerm = searchTerm.toLowerCase()
            

            if (!searchTerm && !articleMax) {
                headlines.push(newObject)
            }

            else if (!searchTerm && articleMaxCounter < articleMax) {
                headlines.push(newObject)
                articleMaxCounter++
            }

            else if (searchTerm && i+1 < articleCount && lowerCaseTitle.includes(lowerCaseSearchTerm) && articleMaxCounter < articleMax) {
                headlines.push(newObject)
                articleMaxCounter++
            }
            
            // 3. Creates a long string of data to be sent off to the Microsoft API using the abstract from each article.
            // The if/else statement is there because the string needs to be closed properly at the end.
            // (notice the slight difference in syntax at the end of the two conditional statements)

            if (i+1 < articleCount) {
                dataString += "\"language\": \"en\", \"id\": \"string" + (i+1) + "\", \"text\": \"" + articleResults[i].abstract + "\" } , { "
            }
            
            else {
                dataString += "\"language\": \"en\", \"id\": \"string" + (i+1) + "\", \"text\": \"" + articleResults[i].abstract + "\" } ]}"
            }           
        }  
    
        // The dataString variable is finished, so let's send it to Microsoft!

        callMicrosoftAPI(dataString, searchTerm)
        
    })
})


// ONCLICK FUNCTION FOR CLEAR BUTTON ===========================================================

$("#clear-all").on("click", function(event) {
    event.preventDefault();
    $("#article-section").empty();
    $("#search-term").val("");
    searchTerm = ""
    $("#positive-articles").empty();
    $("#neutral-articles").empty();
    $("#negative-articles").empty();
    $("select").prop('selectedIndex',0)
})

// ==============================================================================================

// AJAX CALL TO MICROSOFT =======================================================================

function callMicrosoftAPI(dataString, searchTerm){
    // This is the object containing all of the information for the AJAX call.
    // Notice how all of that annoying data is contained in that tidy little dataString variable :) 

    var microsoftObject = {
        "async": true,
        "crossDomain": true,
        "url": "https://microsoft-azure-text-analytics-v1.p.rapidapi.com/sentiment",
        "method": "POST",
        "headers": {
            "x-rapidapi-host": "microsoft-azure-text-analytics-v1.p.rapidapi.com",
            "x-rapidapi-key": microsoftAPIKeyJZ,
            "content-type": "application/json",
            "accept": "application/json"
        },
        "processData": false,
        "data": dataString
    }

    console.log("dataString = " + dataString)
    console.log(microsoftObject)

    $.ajax(microsoftObject).done(function (response) {
        console.log(response);
    
        for (var j=0; j < headlines.length; j++) {
            var sentimentResults = response.documents
            headlines[j].score = sentimentResults[j].score
        }
        
        headlines.sort(function (a, b) {
            return b.score - a.score;
        });

        positiveArticleCount = 0
        neutralArticleCount = 0
        negativeArticleCount = 0
          
        for (k=0; k < headlines.length; k++) {
            if (headlines[k].score > .5 ) {
                var newArticleDiv = createHeadlineDiv(headlines[k]);
                newArticleDiv.appendTo("#positive-articles")
                positiveArticleCount++
            }
            else if(headlines[k].score === .5) {
                var newArticleDiv = createHeadlineDiv(headlines[k]);
                newArticleDiv.appendTo("#neutral-articles")
                neutralArticleCount++

            } else if (headlines[k].score < .5) {
                var newArticleDiv = createHeadlineDiv(headlines[k]);
                newArticleDiv.prependTo("#negative-articles")
                negativeArticleCount++
            }
        }

        // This code tallies the articles and prints "no articles" in the appropriate column if that is the case.

        if (!searchTerm && positiveArticleCount === 0) {
            noPositives = $("<p>")
            noPositives.text("No positive articles!")
            noPositives.appendTo("#positive-articles")
        }

        else if (positiveArticleCount === 0) {
            noPositives = $("<p>")
            noPositives.text("No positive articles containing \"" + searchTerm + "\"")
            noPositives.appendTo("#positive-articles")
        }

        if (!searchTerm && neutralArticleCount === 0) {
            noNeutrals = $("<p>")
            noNeutrals.text("No neutral articles!")
            noNeutrals.appendTo("#neutral-articles")
        }

        else if (searchTerm && neutralArticleCount === 0) {
            noNeutrals = $("<p>")
            noNeutrals.text("No neutral articles containing \"" + searchTerm + "\"")
            noNeutrals.appendTo("#neutral-articles")
        }

        if (negativeArticleCount === 0) {
            noNegatives = $("<p>")
            noNegatives.text("No negative articles containing \"" + searchTerm + "\"")
            noNegatives.appendTo("#negative-articles")
        }

        else if (!searchTerm && negativeArticleCount === 0) {
            noNegatives = $("<p>")
            noNegatives.text("No negative articles!")
            noNegatives.appendTo("#negative-articles")
        }

    });    
}

var star = `
<svg class="bi bi-star" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.523-3.356c.329-.314.158-.888-.283-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767l-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288l1.847-3.658 1.846 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.564.564 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z"/>
</svg>`

function createHeadlineDiv(headline) {
    var newArticleDiv = $("<li>")
    var newArticle = $("<a>")
    
    // Add favorite button to article div
    var favButton = $("<button>")
    favButton.html(star)
    favButton.addClass("btn mr-2")
    favButton.attr("data-title", headline.title)
    favButton.appendTo(newArticleDiv)
    favButton.click(favoriteButtonClicked)
    
    newArticleDiv.addClass("list-group-item")
    newArticle.attr("href", headline.url)
    newArticle.attr("target", "_blank")
    newArticle.html(headline.title)
    newArticle.appendTo(newArticleDiv)
    return newArticleDiv
}

function favoriteButtonClicked(e) {
    e.preventDefault();
    console.log("button clicked");

    var headlineTitle = e.currentTarget.dataset.title
    var inFavorites = false;
    var headline;

    // Check if already in list
    for(var i = 0; i < favoriteHeadlines.length; i++) {
        if(favoriteHeadlines[i].title == headlineTitle) {
            inFavorites = true
        }
    }

    if(!inFavorites) {
        var headline;
        for(var i = 0; i < headlines.length; i++) {
            if(headlines[i].title == headlineTitle) {
                headline = headlines[i]
            }
        }
       favoriteHeadlines.push(headline)
    } else {
        var newFavorites = []
        for(var i = 0; i < favoriteHeadlines.length; i++) {
            if(favoriteHeadlines[i].title != headlineTitle) {
                newFavorites.push(favoriteHeadlines[i])
            }
        }
        favoriteHeadlines = newFavorites
    }

    localStorage.setItem("favorites", JSON.stringify(favoriteHeadlines))

    updateFavorites()
}

function updateFavorites() {
    favoriteHeadlines = JSON.parse(localStorage.getItem("favorites")) || []
    // Clear section before adding
    $("#favorite-articles").empty()

    for(var i = 0; i < favoriteHeadlines.length; i++) {
        var headline = favoriteHeadlines[i];
        var favArticleDiv = createHeadlineDiv(headline);
        favArticleDiv.appendTo("#favorite-articles")
    }
}