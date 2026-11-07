import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import type { ClosureKey } from '../../../state/residence-session/narrative-closure/types'
// Finite adopted text only; candidate conditions/effects/requests are not included.
export const closureCopy = {
  "HC06": {
    "title": "周衡先看了看东西",
    "variants": {
      "ordinary": [
        [
          {
            "speaker": "旁白",
            "text": "周衡坐在工作台旁。你进来时，他把手边几张纸推齐，没有收起来。",
            "id": "HC06.05.01.01"
          },
          {
            "speaker": "周衡",
            "text": "“找什么？”",
            "id": "HC06.05.01.02"
          },
          {
            "speaker": "玩家",
            "text": "“想问医院转运的事。”",
            "id": "HC06.05.01.03"
          }
        ],
        [
          {
            "speaker": "周衡",
            "text": "“处理控制件，先看接口，再拆固定。别照着外壳硬撬。”",
            "id": "HC06.05.02.01"
          }
        ]
      ],
      "component-carried": [
        [
          {
            "speaker": "旁白",
            "text": "周衡先看了看你带来的组件，又看了一眼工单。",
            "id": "HC06.04.01.01"
          },
          {
            "speaker": "周衡",
            "text": "“你把它拆下来了。”",
            "id": "HC06.04.01.02"
          },
          {
            "speaker": "玩家",
            "text": "“还没装回医院。”",
            "id": "HC06.04.01.03"
          }
        ],
        [
          {
            "speaker": "周衡",
            "text": "“先把供电支路分清。别原样接回去。”",
            "id": "HC06.04.02.01"
          }
        ]
      ],
      "component-carried-power": [
        [
          {
            "speaker": "周衡",
            "text": "“你把组件拆下来了。”",
            "id": "HC06.03.01.01"
          },
          {
            "speaker": "玩家",
            "text": "“还没装回医院。供电已经处理过。”",
            "id": "HC06.03.01.02"
          },
          {
            "speaker": "周衡",
            "text": "“那就再核对接线。别把隔开的那一侧接回去。”",
            "id": "HC06.03.01.03"
          }
        ]
      ],
      "transfer-confirmed-not-witnessed": [
        [
          {
            "speaker": "旁白",
            "text": "周衡把手边几张纸推齐，抬头看你。",
            "id": "HC06.02.01.01"
          },
          {
            "speaker": "玩家",
            "text": "“平台恢复了。我想问问当时停运的事。”",
            "id": "HC06.02.01.02"
          },
          {
            "speaker": "周衡",
            "text": "“你想问什么？”",
            "id": "HC06.02.01.03"
          }
        ]
      ]
    }
  },
  "HC07": {
    "title": "只停一班",
    "variants": {
      "signed-order": [
        [
          {
            "speaker": "玩家",
            "text": "“停用记录上，有你的名字。”",
            "id": "HC07.02.01.01"
          },
          {
            "speaker": "周衡",
            "text": "“执行的是我。”",
            "id": "HC07.02.01.02"
          },
          {
            "speaker": "旁白",
            "text": "他把靠近手边的一张纸摊平。",
            "id": "HC07.02.01.03"
          }
        ],
        [
          {
            "speaker": "周衡",
            "text": "“那一侧不能再往安置点接。再晚一点，隔不开了。”",
            "id": "HC07.02.02.01"
          },
          {
            "speaker": "玩家",
            "text": "“另一头的人呢？”",
            "id": "HC07.02.02.02"
          },
          {
            "speaker": "周衡",
            "text": "“我以为只会停一班。”",
            "id": "HC07.02.02.03"
          }
        ]
      ],
      "no-order": [
        [
          {
            "speaker": "玩家",
            "text": "“医院那条转运通道，为什么停了？”",
            "id": "HC07.03.01.01"
          },
          {
            "speaker": "周衡",
            "text": "“我停的。那一侧的危险已经接近安置点。”",
            "id": "HC07.03.01.02"
          }
        ],
        [
          {
            "speaker": "玩家",
            "text": "“后来为什么没恢复？”",
            "id": "HC07.03.02.01"
          },
          {
            "speaker": "周衡",
            "text": "“原本只打算停一班。”",
            "id": "HC07.03.02.02"
          },
          {
            "speaker": "旁白",
            "text": "他看着摊开的纸，没有把那句话补完整。",
            "id": "HC07.03.02.03"
          }
        ]
      ]
    }
  },
  "HC08B": {
    "title": "恢复没有跟上",
    "variants": {
      "reply": [
        [
          {
            "speaker": "周衡",
            "text": "“找部件，等回话。”",
            "id": "HC08B.02.01.01"
          },
          {
            "speaker": "周衡",
            "text": "“后来有些地方过不去了，送来的东西也没接上。就断在这儿。”",
            "id": "HC08B.02.01.02"
          }
        ],
        [
          {
            "speaker": "玩家",
            "text": "“你一直留着这些工单？”",
            "id": "HC08B.02.02.01"
          },
          {
            "speaker": "周衡",
            "text": "“要接回去，总得知道停在哪一步。”",
            "id": "HC08B.02.02.02"
          },
          {
            "speaker": "旁白",
            "text": "他把折起的一角压平。这一次，纸没有弹起来。",
            "id": "HC08B.02.02.03"
          }
        ]
      ],
      "after-transfer": [
        [
          {
            "speaker": "玩家",
            "text": "“现在平台接上了。之前恢复的事，断在了哪一步？”",
            "id": "HC08B.01.01.01"
          },
          {
            "speaker": "周衡",
            "text": "“找部件，等回话。那时候有些地方过不去了，送来的东西也没接上。”",
            "id": "HC08B.01.01.02"
          }
        ],
        [
          {
            "speaker": "玩家",
            "text": "“所以你留着这些工单。”",
            "id": "HC08B.01.02.01"
          },
          {
            "speaker": "周衡",
            "text": "“嗯。知道停在哪一步，才知道这次接上了什么。”",
            "id": "HC08B.01.02.02"
          }
        ]
      ]
    }
  },
  "HC09": {
    "title": "手指指到的地方",
    "variants": {
      "new-method": [
        [
          {
            "speaker": "旁白",
            "text": "他指着图上的受力点。你照着现场的方向，把拆卸顺序核了一遍。",
            "id": "HC09.01.01.01"
          },
          {
            "speaker": "周衡",
            "text": "“先松这边。让重量落稳了，再拆另一边。”",
            "id": "HC09.01.01.02"
          }
        ]
      ]
    }
  },
  "HC18": {
    "title": "现在缺什么就说什么",
    "variants": {
      "unknown": [
        [
          {
            "speaker": "旁白",
            "text": "你停在面板前，先看清上面的提示。",
            "id": "HC18.04.01.01"
          }
        ]
      ],
      "transfer-complete": [
        [
          {
            "speaker": "旁白",
            "text": "平台已经恢复运作。你没有再拆开已装好的部件。",
            "id": "HC18.01.01.01"
          }
        ]
      ]
    }
  },
  "HC19": {
    "title": "这次不是录音",
    "variants": {
      "no-old-audio": [
        [
          {
            "speaker": "旁白",
            "text": "最后一道固定件落进槽里。你把手从面板下抽出来。指示灯一盏接一盏亮起。",
            "id": "HC19.03.01.01"
          }
        ],
        [
          {
            "speaker": "接驳端",
            "text": "“医院端，接驳确认。平台可以用了。”",
            "id": "HC19.03.02.01"
          },
          {
            "speaker": "旁白",
            "text": "话筒没有关。另一句话离它远了一些。",
            "id": "HC19.03.02.02"
          },
          {
            "speaker": "接驳端远声",
            "text": "“慢一点。把担架推过来。”",
            "id": "HC19.03.02.03"
          }
        ],
        [
          {
            "speaker": "玩家",
            "text": "“有人回应了。”",
            "id": "HC19.03.03.01"
          },
          {
            "speaker": "旁白",
            "text": "电机的声音稳定下来。",
            "id": "HC19.03.03.02"
          }
        ]
      ]
    }
  },
  "HC20": {
    "title": "平台动了但事情没完",
    "variants": {
      "sample-carried": [
        [
          {
            "speaker": "玩家",
            "text": "“样本在身上。该回电梯前室交付了。”",
            "id": "HC20.01.01.01"
          }
        ]
      ],
      "sample-left": [
        [
          {
            "speaker": "玩家",
            "text": "“平台接上了。样本还没带回来。”",
            "id": "HC20.02.01.01"
          }
        ]
      ],
      "sample-unavailable": [
        [
          {
            "speaker": "旁白",
            "text": "平台仍在运作。你望了它一会儿，才低头看向委托记录。",
            "id": "HC20.03.01.01"
          }
        ]
      ],
      "ordinary": [
        [
          {
            "speaker": "玩家",
            "text": "“转运恢复了。还有样本。”",
            "id": "HC20.04.01.01"
          }
        ]
      ]
    }
  },
  "HC24": {
    "title": "门前最后一次核对",
    "variants": {
      "eligible": [
        [
          {
            "speaker": "旁白",
            "text": "电梯门就在面前。你扶稳随身的样本，抬头看向门边的屏幕。",
            "id": "HC24.01.01.01"
          },
          {
            "speaker": "玩家",
            "text": "“在这里交付。”",
            "id": "HC24.01.01.02"
          }
        ]
      ],
      "not-eligible": [
        [
          {
            "speaker": "旁白",
            "text": "电梯门就在面前。现在结束，未完成的部分就留在这次委托里了。",
            "id": "HC24.02.01.01"
          }
        ]
      ]
    }
  },
  "HC25": {
    "title": "完整履约",
    "variants": {
      "wounded": [
        [
          {
            "speaker": "中枢",
            "text": "“委托完成。指定样本已交付。”",
            "id": "HC25.01.01.01"
          },
          {
            "speaker": "旁白",
            "text": "门合上时，你才松开一直绷着的肩膀。疼痛没有跟着门一起留在外面。",
            "id": "HC25.01.01.02"
          }
        ],
        [
          {
            "speaker": "旁白",
            "text": "那本日记仍然放在长椅上。你在门边站了一会儿，才朝它走去。",
            "id": "HC25.01.02.01"
          }
        ]
      ],
      "no-injury": [
        [
          {
            "speaker": "中枢",
            "text": "“委托完成。指定样本已交付。”",
            "id": "HC25.02.01.01"
          },
          {
            "speaker": "旁白",
            "text": "门合上时，你才松开一直绷着的肩膀。",
            "id": "HC25.02.01.02"
          }
        ],
        [
          {
            "speaker": "旁白",
            "text": "那本日记仍然放在长椅上。你在门边站了一会儿，才朝它走去。",
            "id": "HC25.02.02.01"
          }
        ]
      ]
    }
  },
  "HC25B": {
    "title": "通路已经重新用了",
    "variants": {
      "neutral": [
        [
          {
            "speaker": "玩家",
            "text": "“至少，那条通路又重新用了。”",
            "id": "HC25B.02.01.01"
          },
          {
            "speaker": "旁白",
            "text": "屏幕上，医院服务支路的那一项已经亮起。",
            "id": "HC25B.02.01.02"
          }
        ]
      ]
    }
  },
  "HC26": {
    "title": "主动止损也是这次的结果",
    "variants": {
      "transfer-no-sample": [
        [
          {
            "speaker": "中枢",
            "text": "“本次委托已结束。必要成果未全部达成。”",
            "id": "HC26.01.01.01"
          },
          {
            "speaker": "旁白",
            "text": "转运已经恢复。样本没有跟你回来。",
            "id": "HC26.01.01.02"
          }
        ],
        [
          {
            "speaker": "旁白",
            "text": "你听着门在身后合上。医院那一端还在运作，你却已经回来了。",
            "id": "HC26.01.02.01"
          }
        ]
      ],
      "sample-no-transfer": [
        [
          {
            "speaker": "中枢",
            "text": "“本次委托已结束。必要成果未全部达成。”",
            "id": "HC26.02.01.01"
          },
          {
            "speaker": "旁白",
            "text": "箱子留在交付处。你空着手站在它面前。",
            "id": "HC26.02.01.02"
          }
        ],
        [
          {
            "speaker": "旁白",
            "text": "你把手收回来，掌心还记得提着它的分量。你还活着。",
            "id": "HC26.02.02.01"
          }
        ]
      ],
      "neither": [
        [
          {
            "speaker": "中枢",
            "text": "“本次委托已结束。必要成果未全部达成。”",
            "id": "HC26.03.01.01"
          },
          {
            "speaker": "旁白",
            "text": "你等了一会儿。屏幕没有继续催促，也没有替你改写结果。",
            "id": "HC26.03.01.02"
          }
        ],
        [
          {
            "speaker": "旁白",
            "text": "你还活着。",
            "id": "HC26.03.02.01"
          }
        ]
      ]
    }
  },
  "HC28": {
    "title": "驻留期结束",
    "variants": {
      "transfer": [
        [
          {
            "speaker": "中枢",
            "text": "“驻留期结束。本次委托未完成。”",
            "id": "HC28.01.01.01"
          },
          {
            "speaker": "旁白",
            "text": "你再次看见中枢的门。医院里那段接上的通路，留在门的另一边。",
            "id": "HC28.01.01.02"
          }
        ],
        [
          {
            "speaker": "旁白",
            "text": "你望着门，想起还有一段路没有走完。门没有再打开。",
            "id": "HC28.01.02.01"
          }
        ]
      ],
      "ordinary": [
        [
          {
            "speaker": "中枢",
            "text": "“驻留期结束。本次委托未完成。”",
            "id": "HC28.02.01.01"
          },
          {
            "speaker": "旁白",
            "text": "你再次看见中枢的门。门外那条没有走完的路，已经不能回去接着走。",
            "id": "HC28.02.01.02"
          }
        ],
        [
          {
            "speaker": "旁白",
            "text": "你在门边停了一会儿。医院里的声音已经听不见了。",
            "id": "HC28.02.02.01"
          }
        ]
      ]
    }
  },
  "HC29": {
    "title": "这一个人的经历结束",
    "variants": {
      "other": [
        [
          {
            "speaker": "旁白",
            "text": "最后的声音逐渐远去。",
            "id": "HC29.02.01.01"
          },
          {
            "speaker": "系统",
            "text": "“这一角色的经历结束。”",
            "id": "HC29.02.01.02"
          }
        ]
      ]
    }
  },
  "HC30": {
    "title": "没有下一份内容时",
    "variants": {
      "living": [
        [
          {
            "speaker": "系统",
            "text": "“当前章节结束。可查看本次结果与已解锁记录。”",
            "id": "HC30.01.01.01"
          }
        ]
      ],
      "dead": [
        [
          {
            "speaker": "系统",
            "text": "“本次经历已结束。可查看已保留的历史记录。”",
            "id": "HC30.02.01.01"
          }
        ]
      ]
    }
  }
} as const
export type ClosureCard = readonly Readonly<{ speaker: string; text: string; id: string }>[]
export function closureCards(key: ClosureKey, view: PlayerReadyView): readonly ClosureCard[] {
 const k=view.closure
 switch(key){
 case 'HC06': return closureCopy.HC06.variants[k?.transfer?'transfer-confirmed-not-witnessed':k?.componentCarried?k.power?'component-carried-power':'component-carried':'ordinary']
 case 'HC07': return closureCopy.HC07.variants[k?.workorder?'signed-order':'no-order']
 case 'HC08B': return closureCopy.HC08B.variants[k?.transfer?'after-transfer':'reply']
 case 'HC09': return closureCopy.HC09.variants['new-method']
 case 'HC19': return closureCopy.HC19.variants['no-old-audio']
 case 'HC25': return closureCopy.HC25.variants[view.body.wounds.length||view.body.minorContusions?'wounded':'no-injury']
 case 'HC26': return closureCopy.HC26.variants[view.terminal.result?.items.some(i=>i.disposition==='partial-delivery')&&!k?.transfer?'sample-no-transfer':k?.transfer&&!view.terminal.result?.items.some(i=>i.disposition==='partial-delivery')?'transfer-no-sample':'neither']
 case 'HC28': return closureCopy.HC28.variants[k?.transfer?'transfer':'ordinary']
 case 'HC29': return closureCopy.HC29.variants.other
 }
}
export function sampleReminder(view:PlayerReadyView) {
 const state=view.tasks.sample,variant=state==='carried'?'sample-carried':state==='left-in-world'?'sample-left':state==='unavailable'?'sample-unavailable':'ordinary'
 return closureCopy.HC20.variants[variant][0].map(l=>l.text).join('')
}
