#! /usr/bin/ruby -w

# Replaces footnote placeholders #29#..#48# in <content_file> with links
# and brings in the footnotes from <orig_file>

require 'nokogiri'

orig_file = File.open("book-Z-H-11.html")
orig_page = Nokogiri::HTML(orig_file)
orig_file.close

content_file = File.open("content/1-2-procedures.content.old.html", "r")
content_page = content_file.read
content_file.close

new_file = File.open("content/1-2-procedures.content.html", "w")

footnotes = orig_page.css("div.footnote")
  .to_s
  .split(/\n\n/)[1..-2]

foothash, link = {}, {}
div_end = "\n</p></div>\n\n"

footnotes.each do |footnote|
  footnote =~ /<small>\s*(\d{1,2})\s*<\/small>/
  marker = $1.to_i
  # Alternative (but silly) way to extract marker:
  # marker = Nokogiri::HTML(footnote).css("small").text.to_i

  text = footnote

  # Delete unneeded tags and newlines
  text.sub!(/<\/p>\n<p>/, "")
  text.gsub!(/<a name="(footnote|%_idx).+?<\/a>/, "")
  text.gsub!(/\n/, " ")

  link[marker] = "<a name=\"footnote_link_1-#{marker}\" class=\"footnote_link\" href=\"\#footnote_1-#{marker}\">#{marker}</a>"
  div_start = "<div id=\"footnote_1-#{marker}\" class=\"footnote\">\n<p>"
  backlink = "<a href=\"\#footnote_link_1-#{marker}\" class=\"footnote_backlink\">#{marker}</a>\n"

  foothash[marker] = div_start + backlink + text + div_end
end

# Replace the #<number># tags
content_page.gsub!(/\#\d{1,2}\#/) { |tag| link[tag[1..-2].to_i] }

remaining_notes = ""

# Concatenate notes 29..48 into one string...
(29..48).to_a.each do |marker| 
  remaining_notes += foothash[marker]
end

# ...and put it where the #remaining# tag is
content_page.sub!(/\#remaining\#/, remaining_notes)

new_file.write(content_page)
new_file.close
