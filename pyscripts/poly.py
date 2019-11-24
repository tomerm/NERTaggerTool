from polyglot.text import Text
from polyglot.detect import Detector
import sys

def main():
    blob = []
    count = 0
    if len(sys.argv) != 2:
        print("Use: python poly.py <path-to-file>")
        return
    print("Input from: ", sys.argv[1])
    f = open(sys.argv[1], 'r', encoding='utf-8')
    w = open(sys.argv[1] +"_P", 'w', encoding="utf-8")
    for line in f:
        row = line.strip()
        if row == "":
            continue
        blob.append(line.strip())
        count += 1
    f.close()
    print("Got lines: " + str(count))
    if count == 0:
        return

    '''
    for i in range(len(blob)):
        txt = blob[i]
        w.write("Line: " + str(i+1) + "\n" + txt + "\n");
        text = Text(txt, hint_language_code='he')
        words = "%s"%(text.words)
        w.write("Words: %s"%(words) + "\n")
        entities = text.entities
        for j in range(len(entities)):
            res = "%s"%(entities[j]) + " | " + entities[j].tag + " | " + str(entities[j].start) + " | " + str(entities[j].end)
            w.write(res + "\n")
        w.write("==========\n")
        for k in range(len(text.sentences)):
            sentence = text.sentences[k]
            sentence.hint_language_code = "he"
            sent = "%s"%(sentence)
            w.write("\tSentence: " + str(k+1) + "\n" + sent + "\n")
            for j in range(len(sentence.entities)):
                res = "%s"%(sentence.entities[j]) + " | " + sentence.entities[j].tag + " | " + str(sentence.entities[j].start) + " | " + str(sentence.entities[j].end)
                w.write(res + "\n")
        w.write("============================================================================================================================\n")
    w.close()   
    '''

    w = open(sys.argv[1] +"_poly", 'w', encoding="utf-8")    
    for i in range(len(blob)):
        txt = blob[i]
        text = Text(txt, hint_language_code='he')
        words = text.words
        entities = text.entities
        for j in range(len(words)):
            tag = "O"
            for ent in entities:
                etag = ent.tag.split("-")[1]
                if ent.start == j:
                    tag = "B-" + etag
                    break
                elif j>ent.start and j<ent.end:
                    tag = "I-" + etag
                    break
            w.write(words[j] + " " + tag + "\n")
        w.write("\n")
    w.close()

if __name__ == "__main__":
    main()