#!/usr/bin/env python
from __future__ import print_function, unicode_literals
import sys
import re
import codecs

if sys.version_info.major < 3:
    # The Python 2 open doesn't have an encoding= parameter
    from io import open

    # From https://stackoverflow.com/questions/10569438/how-to-print-unicode-character-in-python
    UTF8Writer = codecs.getwriter('utf8')
    sys.stdout = UTF8Writer(sys.stdout)


tag_re = re.compile(
    r"^({{[\w@]+}})$"  # ()Capture {{Tag}} word,
    r"(.*?)"  # then ()capture characters until
    r"^@@$",  # terminating "@@" line.
    flags=re.DOTALL | re.MULTILINE)  # '.' includes '\n' | '^' and '$' are per line.


def get_tagged_content(file_path):
    with open(file_path, mode="r", encoding="utf8") as content:
        tag_content = dict(re.findall(tag_re, ''.join(content.readlines())))
        return tag_content


def write_output(tagged_content, output_function):
    with open("template.html", mode="r", encoding="utf8") as template:
        for line in template.readlines():
            output_function(tagged_content.get(line.strip(), line))


if __name__ == "__main__":
    # print("processing {}".format(sys.argv[1]), file=sys.stderr)
    def print_func(string):
        print(string, end="")

    write_output(get_tagged_content(sys.argv[1]), print_func)
