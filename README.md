# gfl-ze-watcher
![Code Size](https://img.shields.io/github/languages/code-size/InterStella0/gfl-ze-watcher?style=flat)
![Total lines](https://tokei.rs/b1/github/InterStella0/gfl-ze-watcher?style=flat)

Show GFL ZE data for my own needs.
[Website](https://gflgraph.prettymella.site/) is hosted on a smol vps, be nice :)

This is codebase is purely for displaying data from the database. Itself does
not store the player data and webscraping. Those are hidden.

## How it works
```mermaid
flowchart TD
    Frontend["The website"]
    Backend["Backend"]
    DataScraper["Data Scraper (Hidden)"]
    SteamProtocol["Steam Protocols"]
    PFP["Steam PFP Provider"]

    Frontend --> Backend
    PFP --> |URL Only| Backend
    Backend --> |Simple Write Only| Database
    Database --> |Heavy Query| Backend
    Backend --> Frontend
    DataScraper --> Database
    Database --> DataScraper
    SteamProtocol --> DataScraper
    GFLBans --> DataScraper
```

## Preview
![Main Page](assets/img.png)

![Players Page](assets/players.png)

![Player Page](assets/player.png)

![Maps Page](assets/maps.png)

![Map Page](assets/map.png)
