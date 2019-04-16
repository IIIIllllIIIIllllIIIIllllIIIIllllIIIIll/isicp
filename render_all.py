#!/usr/bin/env python3
import os
from render import get_tagged_content, write_output


if __name__ == "__main__":
    for input_filename in os.listdir(path="content"):
        with open(input_filename.replace(".content", ""), mode="w", encoding="utf8") as output_file:
            def file_writer(line):
                output_file.write(line)

            write_output(get_tagged_content(os.path.join("content", input_filename)), file_writer)
