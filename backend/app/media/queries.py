MEDIA_QUERY = """query($mediaId: Int) {
  Media(id: $mediaId) {
    ...MediaFields
    recommendations {
      nodes {
        mediaRecommendation {
          ...MediaFields
        }
        id
        rating
      }
    }
  }
}

fragment MediaFields on Media {
  id
  title {
    romaji
    english
    native
  }
  averageScore
  bannerImage
  chapters
  coverImage {
    extraLarge
    large
    medium
    color
  }
  description
  duration
  endDate {
    year
    month
    day
  }
  episodes
  favourites
  format
  genres
  isAdult
  meanScore
  popularity
  rankings {
    id
    rank
    type
    format
    year
    season
    allTime
    context
  }
  season
  seasonYear
  startDate {
    year
    month
    day
  }
  volumes
    studios {
      nodes {
        name
        id
        isAnimationStudio
      }
      pageInfo {
        total
        perPage
        currentPage
        lastPage
        hasNextPage
      }
    }
  type
  source
  trailer {
    id
    site
    thumbnail
  }
  countryOfOrigin
  idMal
  siteUrl
  synonyms
  tags {
    id
    name
    description
    category
    rank
    isGeneralSpoiler
    isMediaSpoiler
    isAdult
    userId
  }
  updatedAt
  status
  externalLinks {
    id
    url
    site
    siteId
    type
    language
    color
    icon
    notes
    isDisabled
  }
  isLicensed
}
"""

USER_QUERY = """query($userName: String, $type: MediaType) {
  MediaListCollection(userName: $userName, type: $type) {
    lists {
      entries {
        mediaId
      }
      status
    }
  }
}"""

SEARCH_QUERY = """query($search: String, $page: Int, $perPage: Int, $type: MediaType) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    media(search: $search, type: $type) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        medium
        large
      }
      type
      format
      status
      averageScore
      startDate {
        year
        month
        day
      }
    }
  }
}"""
