# gfl-ze-watcher
![Code Size](https://img.shields.io/github/languages/code-size/InterStella0/gfl-ze-watcher?style=flat)
![Total lines](https://tokei.rs/b1/github/InterStella0/gfl-ze-watcher?style=flat)

Show GFL ZE data for my own needs.
[Website](https://gflgraph.prettymella.site/) is hosted on a smol vps, be nice :)

This is codebase is purely for displaying data from the database. Itself does
not store the player data and webscraping. Those are hidden.

## How it works
```mermaid
flowchart LR
  %% Frontend
  subgraph FE["🌐 Frontend"]
    direction TB
    Website["The Website"]
  end

  %% Backend & GIS
  subgraph BE["🖥️ Backend & GIS"]
    direction TB
    Backend["Backend"]
    QGIS["QGIS Server"]
  end

  %% Scraper & Database
  subgraph DSDB["🗄️ Scraper & Database"]
    direction TB
    DataScraper["Data Scraper (Hidden)"]
    Database["Database"]
  end

  %% External services
  subgraph EX["🔗 External Services"]
    direction TB
    ProfileProvider["Profile Provider"]
    SteamAPI["Steam API"]
    SteamProtocol["Steam Protocols"]
    GFLBans["GFLBans"]
  end

  %% Connections
  Website        --> Backend
  QGIS           -- WMS --> Website
  Database       -- PostGIS --> QGIS
  Backend        -->|Write Only| Database
  Database       -->|Heavy Query| Backend
  Backend        --> Website
  DataScraper    --> Database
  Database       --> DataScraper
  ProfileProvider --> Backend
  SteamAPI       --> Backend
  SteamAPI       --> DataScraper
  SteamProtocol  --> DataScraper
  GFLBans        --> DataScraper

  %% Dark‑theme styles
  style Website        fill:#0d1117,stroke:#58a6ff,stroke-width:2px,color:#c9d1d9
  style Backend        fill:#0d1117,stroke:#79c0ff,stroke-width:2px,color:#c9d1d9
  style QGIS           fill:#0d1117,stroke:#a5d6ff,stroke-width:2px,color:#c9d1d9
  style DataScraper    fill:#0d1117,stroke:#ffa657,stroke-width:2px,color:#c9d1d9
  style Database       fill:#0d1117,stroke:#d2a8ff,stroke-width:2px,color:#c9d1d9
  style ProfileProvider fill:#0d1117,stroke:#f0883e,stroke-width:2px,color:#c9d1d9
  style SteamAPI       fill:#0d1117,stroke:#2ea043,stroke-width:2px,color:#c9d1d9
  style SteamProtocol  fill:#0d1117,stroke:#238636,stroke-width:2px,color:#c9d1d9
  style GFLBans        fill:#0d1117,stroke:#bf3989,stroke-width:2px,color:#c9d1d9
```
## Preview
![Main Page](assets/img.png)

![Players Page](assets/players.png)

![Player Page](assets/player.png)

![Maps Page](assets/maps.png)

![Map Page](assets/map.png)

![Radar Page](assets/radar_overall.png)

![Radar Page2](assets/radar_country.png)

![Tracker Page](assets/tracker.png)