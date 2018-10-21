import os
import urllib

# settings
base_url = "http://data.phys.ucalgary.ca/sort_by_project/AuroraMAX/rt-movies/mp4/"
resolution = "720p"
folder = "video"
months = [
    [2015, 11, 10, 30],
    [2015, 12, 01, 31],
    [2016, 01, 01, 31],
    [2016, 02, 01, 29],
    [2016, 03, 01, 31],
    [2016, 04, 01, 19]
]

# create 'video' folder
if not os.path.exists(folder):
    os.makedirs(folder)

# download all videos sequentially
for month in months:
    for day in range(month[2], month[3] + 1):
        yy = str(month[0])
        mm = str(month[1]).zfill(2)
        dd = str(day).zfill(2)
        filename = "auroramaxHD_" + yy + mm + dd + "_" + resolution + ".mp4"
        url = base_url + yy + "/" + mm + "/" + dd + "/" + filename
        try:
            download = urllib.URLopener()
            download.retrieve(url, folder + "/" + filename)
            print("success: " + filename)
        except:
            print("failure: " + filename)