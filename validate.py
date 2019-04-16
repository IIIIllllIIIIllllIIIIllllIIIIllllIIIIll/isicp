#!/usr/bin/env python3
""" This is taken from the w3c_validator package, which would not install for some reason. """
import requests
import logging
import tempfile
import os

LOGGER = logging.getLogger(__name__)
HTML_VALIDATOR_URL = "http://validator.w3.org/nu/?out=json"


def validate(filename):
    """
    Validate file and return JSON result as dictionary.
    "filename" can be a file name or an HTTP URL.
    Return "" if the validator does not return valid JSON.
    Raise OSError if curl command returns an error status.
    """
    # is_css = filename.endswith(".css")

    is_remote = filename.startswith("http://") or filename.startswith(
        "https://")
    with tempfile.TemporaryFile() if is_remote else open(
            filename, "rb") as f:

        if is_remote:
            r = requests.get(filename, verify=False)
            f.write(r.content)
            f.seek(0)

        # if is_css:
        #     cmd = (
        #         "curl -sF \"file=@%s;type=text/css\" -F output=json -F warning=0 %s"
        #         % (quoted_filename, CSS_VALIDATOR_URL))
        #     _ = cmd
        # else:
        r = requests.post(
            HTML_VALIDATOR_URL,
            files={"file": (filename, f, "text/html")},
            data={
                "out": "json",
                "showsource": "yes",
            },
            verify=False)

    return r.json()


failures = 0
for file_name in os.listdir("."):
    if file_name.endswith(".html") and file_name[0] in ["1", "2", "3", "4", "5"]:
        print("Processing " + file_name)
        messages = validate(file_name)["messages"]
        for m in messages:
            if not (m["message"].startswith("An “img” element must have an “alt” attribute")):
                    # or m["message"].startswith("The “name” attribute is obsolete")):
                failures += 1
                # Note that the line in the .content.html file will be about 74 lines earlier than the printed number
                # because of the extra ones added during rendering.
                print("Type: %(type)s, Line: %(lastLine)d, Description: %(message)s" % m)

if failures == 0:
    print("All files passed")
else:
    print("{} errors".format(failures))
