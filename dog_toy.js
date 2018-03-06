/*
global muxbots
*/

const barkshopToys = {
  url: 'https://www.barkshop.com/dog-toys',
  parseToys: (pageContent) => {
    const pageContentJson = /window.page = (.*)/.exec(pageContent)[1]
    const parsedJson = JSON.parse(pageContentJson)
    const parsedToys = parsedJson.items.map((toyContent) => {
      const url = toyContent.url
      const name = toyContent.name
      const imageURL = toyContent.images.grid[0].url
      return { url, imageURL, name }
    })
    return parsedToys
  }
}

const muttropolisToys = {
  url: 'https://www.muttropolis.com/dog-toys/browse/perpage/100',
  parseToys: (pageContent) => {
    const products = pageContent.split('<article class="productListing ">')
    products.shift()
    const parsedToys = products.map((product) => {
      const urlResults = /<a class="product" href="(.*)" title="(.*)" >/.exec(product)
      const url = encodeURI(urlResults[1])
      const name = urlResults[2]
      const imageResults = /<img src="(.*)" alt=".*" \/>/.exec(product)
      const imageURL = imageResults[1]
      return { url, imageURL, name }
    })
    return parsedToys
  }
}

muxbots.onFeedPull((callback) => {
  if (shouldFetchRSS()) {
    const toySites = [barkshopToys, muttropolisToys]
    let toySiteData = {}
    const syncCallback = (toySite, response) => {
      if (!response.data) {
        toySiteData[`${toySite.url}`] = []
      } else {
        const parsedToys = toySite.parseToys(response.data)
        toySiteData[`${toySite.url}`] = parsedToys
      }
      if (Object.keys(toySiteData).length === toySites.length) {
        recordFetchTime()
        let combinedParsedToys = []
        Object.values(toySiteData).forEach((toys) => {
          combinedParsedToys = combinedParsedToys.concat(toys)
        })
        muxbots.localStorage.setItem('toys', combinedParsedToys)
        const toy = getUnseenToy(combinedParsedToys)
        fetchFullToyPage(toy, callback)
      }
    }

    toySites.forEach((toySite) => {
      muxbots.http.get(toySite.url, (response) => {
        syncCallback(toySite, response)
      })
    })
  } else {
    const toys = muxbots.localStorage.getItem('toys')
    const toy = getUnseenToy(toys)
    fetchFullToyPage(toy, callback)
  }
})

const shouldFetchRSS = () => {
  const lastFetchTime = muxbots.localStorage.getItem('lastFetchTime')
  if (lastFetchTime === undefined) {
    return true
  }
  const currentDate = new Date()
  // 5 minutes time interval.
  return (currentDate.getTime() - lastFetchTime) > 300000
}

const recordFetchTime = () => {
  const currentDate = new Date()
  muxbots.localStorage.setItem('lastFetchTime', currentDate.getTime())
}

const getUnseenToy = (toys) => {
  let viewedURLs = muxbots.localStorage.getItem('viewedURLs') || []
  let viewedURLSet = new Set(viewedURLs)
  let newViewedURLs = []
  let unseenToy = null
  const shuffledToys = shuffleToys(toys)
  shuffledToys.forEach((toy) => {
    if (viewedURLSet.has(toy.url)) {
      newViewedURLs.push(toy.url)
    } else {
      unseenToy = unseenToy || toy
    }
  })
  if (unseenToy) {
    newViewedURLs.push(unseenToy.url)
  }
  muxbots.localStorage.setItem('viewedURLs', newViewedURLs)
  return unseenToy
}

const shuffleToys = (toys) => {
  const length = toys.length - 1
  for (var i = length; i >= 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1))
    const itemAtIndex = toys[randomIndex]
    toys[randomIndex] = toys[i]
    toys[i] = itemAtIndex
  }
  return toys
}

const fetchFullToyPage = (toy, callback) => {
  muxbots.newResponse()
    .addWebpage(muxbots.newWebpage()
      .setURL(toy.url)
      .setTitle(toy.name)
      .setImage(toy.imageURL))
    .send(callback)
}
