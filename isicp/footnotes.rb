#! /usr/bin/ruby -w

# Replaces footnote placeholders #7#..#28# in <content_file> with links
# and brings in the footnotes from <orig_file>

require 'nokogiri'

orig_file = File.open("book-Z-H-10.html")
orig_page = Nokogiri::HTML(orig_file)
orig_file.close

content_file = File.open("content/1-1-elements.content.old.html", "r")
content_page = content_file.read
content_file.close

new_file = File.open("content/1-1-elements.content.html", "w")

# At the moment, works only with section 1.1, 
# section 1.2 has multiple paragraphs per footnote.
footnotes = orig_page.css("div.footnote p") 

foothash, link = {}, {}
div_end = "\n</p></div>\n\n"

footnotes.each do |footnote|
  marker = footnote.css("small").text.to_i
  text = footnote.to_s

  # Delete unneeded tags and newlines
  text.gsub!(/<a name="(footnote|%_idx).+?<\/a>/, "")
  text.gsub!(/<\/?p>/, "")
  text.gsub!(/\n/, " ")

  link[marker] = "<a name=\"footnote_link_1-#{marker}\" class=\"footnote_link\" href=\"\#footnote_1-#{marker}\">#{marker}</a>"
  div_start = "<div id=\"footnote_1-#{marker}\" class=\"footnote\">\n<p>"
  backlink = "<a href=\"\#footnote_link_1-#{marker}\" class=\"footnote_backlink\">#{marker}</a>\n"

  foothash[marker] = div_start + backlink + text + div_end
end

# Replace the #<number># tags
content_page.gsub!(/\#\d{1,2}\#/) { |tag| link[tag[1..-2].to_i] }

remaining_notes = ""

# Concatenate notes 7 to 28 into one string...
(7..28).to_a.each do |marker| 
  remaining_notes += foothash[marker]
end

# ...and put it where the #remaining# tag is
content_page.sub!(/\#remaining\#/, remaining_notes)

new_file.write(content_page)
new_file.close
