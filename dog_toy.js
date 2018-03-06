/*
global muxbots
*/

const barkshopToys = {
  url: 'https://www.barkshop.com/dog-toys',
  parseToys: (pageContent, callback) => {
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

muxbots.onFeedPull((callback) => {
  if (shouldFetchRSS(barkshopToys.url)) {
    muxbots.http.get(barkshopToys.url, (response) => {
      if (!response.data) {
        muxbots.newResponse()
          .send(callback, 'Error fetching the doggy toys.')
        return
      }
      recordFetchTime(barkshopToys.url)
      const parsedToys = barkshopToys.parseToys(response.data)
      muxbots.localStorage.setItem('toys', parsedToys)
      const toy = getUnseenToy(parsedToys)
      fetchFullToyPage(toy, callback)
    })
  } else {
    const toys = muxbots.localStorage.getItem('toys')
    const toy = getUnseenToy(toys)
    fetchFullToyPage(toy, callback)
  }
})

const shouldFetchRSS = (url) => {
  const lastFetchTime = muxbots.localStorage.getItem(`lastFetchTime-${url}`)
  if (lastFetchTime === undefined) {
    return true
  }
  const currentDate = new Date()
  // 5 minutes time interval.
  return (currentDate.getTime() - lastFetchTime) > 300000
}

const recordFetchTime = (url) => {
  const currentDate = new Date()
  muxbots.localStorage.setItem(`lastFetchTime-${url}`, currentDate.getTime())
}

const getUnseenToy = (toys) => {
  let viewedURLs = muxbots.localStorage.getItem('viewedURLs') || []
  let viewedURLSet = new Set(viewedURLs)
  let newViewedURLs = []
  let unseenToy = null
  toys.forEach((toy) => {
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

const fetchFullToyPage = (toy, callback) => {
  muxbots.newResponse()
    .addWebpage(muxbots.newWebpage()
      .setURL(toy.url)
      .setTitle(toy.name)
      .setImage(toy.imageURL))
    .send(callback)
}
