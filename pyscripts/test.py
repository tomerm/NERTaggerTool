import numpy as np
import os
import glob
import datetime
import sys
from pathlib import Path
import random
from keras.models import Model
from keras.layers import TimeDistributed,Conv1D,Dense,Embedding,Input,Dropout,LSTM,Bidirectional,MaxPooling1D,Flatten,concatenate
from keras.utils import Progbar
from keras.preprocessing.sequence import pad_sequences
from keras.models import load_model
from keras.initializers import RandomUniform

class Ner1Model:
    def __init__(self, data, format, resources):
        self.data = data
        self.format = format
        self.resources = resources
        self.model = load_model(resources + "/model.h5")
        self.labels = np.load(resources + "/idx2Label.npy")
        self.word2Idx = np.load(self.resources + "/word2Idx.npy")
        self.testData = self.loadData()
        self.addCharInformation()
        self.testData = padding(self.createMatrices())
        preds = self.getPredictions(self.testData)
        self.savePredictions(preds)

    def loadData(self):
        f = open(self.data, 'r', encoding='utf-8')
        sentences = []
        sentence = []
        for line in f:
            line = line.strip()
            if len(line) == 0 :
                if len(sentence) > 0:
                    sentences.append(sentence)
                    sentence = []
                continue
            splits = line.split(' ')
            if self.format == "BU":
                if splits[-1].startswith("Person") or splits[-1].startswith("Location") or splits[-1].startswith("Organization"):
                    subs = splits[-1].split("_")
                    reps = []
                    if subs[1] == "unique" or subs[1] == "begin":
                        reps.append("B")
                    else:
                        reps.append("I")
                    if splits[-1].startswith("Person"):
                        reps.append("PER")
                    elif splits[-1].startswith("Location"):
                        reps.append("LOC")
                    else:
                        reps.append("ORG")
                    splits[-1] = "-".join(reps)
                else:
                    splits[-1] = "O"
            sentence.append([splits[0], splits[-1]])
        f.close()
        if len(sentence) >0:
            sentences.append(sentence)
        self.sentences = sentences
        return sentences

    def addCharInformation(self):
        for i,sentence in enumerate(self.testData):
            for j,data in enumerate(sentence):
                chars = [c for c in data[0]]
                self.testData[i][j] = [data[0],chars]

    def createMatrices(self):
        unknownIdx = self.word2Idx.item().get('UNKNOWN_TOKEN')
        #paddingIdx = self.word2Idx['PADDING_TOKEN']            
        dataset = []
        char2Idx = getChar2Idx()
        for sentence in self.testData:
            wordIndices = []    
            caseIndices = []
            charIndices = []
            for word,char in sentence:  
                if word in self.word2Idx.item():
                    wordIdx = self.word2Idx.item().get(word)
                else:
                    wordIdx = unknownIdx
                charIdx = []
                for x in char:
                    if x not in char2Idx:
                        char2Idx[x] = len(char2Idx)
                    charIdx.append(char2Idx[x])
                wordIndices.append(wordIdx)
                caseIndices.append(getCasing(word))
                charIndices.append(charIdx)
            dataset.append([wordIndices, caseIndices, charIndices]) 
        return dataset

    def getPredictions(self, test_batch):
        predLabels = []
        for i,data in enumerate(test_batch):    
            tokens, casing,char = data
            tokens = np.asarray([tokens])     
            casing = np.asarray([casing])
            char = np.asarray([char])
            arrPred = self.model.predict([tokens, casing,char], verbose=False)
            pred = arrPred[0]
            pred = pred.argmax(axis=-1) #Predict the classes            
            predLabels.append(pred)
        return predLabels            

    def savePredictions(self, preds):
        f = open(self.data + "_", 'w', encoding='utf-8')
        for i,sentence in enumerate(self.sentences):
            for j, token in enumerate(sentence):
                token[1] = self.labels.item().get(preds[i][j])
                f.write("%s %s\n" % (token[0], token[1]))
            f.write("\n")
        f.close()

def getChar2Idx():
    char2Idx = {"PADDING":0, "UNKNOWN":1}
    start = ord('\u0591')
    end = ord('\u05f4')
    alphabet = ''
    for i in range(start, end+1):
        ch = chr(i)
        alphabet = alphabet + ch
    alphabet += ".,-_()[]{}!?:;#'\"/\\%$`&=*+@^~|"
    for c in alphabet:
        char2Idx[c] = len(char2Idx)
    return char2Idx

def getCasing(word):   
    caseLookup = {'numeric': 0, 'other':1, 'allLower': 2, 'mainly_numeric':3, 'contains_digit': 4, 'PADDING_TOKEN':5}
    casing = 'other'    
    numDigits = 0
    for char in word:
        if char.isdigit():
            numDigits += 1
    digitFraction = numDigits / float(len(word))
    if word.isdigit(): #Is a digit
        casing = 'numeric'
    elif digitFraction > 0.5:
        casing = 'mainly_numeric'
    elif numDigits > 0:
        casing = 'contains_digit'        
    elif word.islower() or word.isupper(): #All lower case
        casing = 'allLower'
    return caseLookup[casing]

def padding(sentences):
    maxlen = 52
    for sentence in sentences:
        char = sentence[2]
        for x in char:
            maxlen = max(maxlen,len(x))
    for i,sentence in enumerate(sentences):
        sentences[i][2] = pad_sequences(sentences[i][2], maxlen, padding='post')
    return sentences

def main():
    err = False
    if len(sys.argv) < 7:
        err = True
    elif sys.argv[1] != "-data" or sys.argv[3] != '-resources' or sys.argv[5] != '-format':
        err = True
    elif not os.path.isfile(sys.argv[2]) or not os.path.isdir(sys.argv[4]):
        err = True
    elif sys.argv[6] != 'BU' and sys.argv[6] != 'IOB':
        err = True
    if err:
        print ("Error: wrong parameters.")
        return
    model = Ner1Model(sys.argv[2], sys.argv[6], sys.argv[4])

if __name__ == "__main__":
    main()