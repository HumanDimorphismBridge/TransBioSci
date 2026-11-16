> **审阅状态**：本文尚待编辑和医学复核。

> **先说结论：** 压力表上的数字只有与**单位、正负号、量程及测量位置**一起阅读，才有明确意义。`5 inHg` 与 `5 psi` 不相同，`−5 inHg` 的表压与显示为 `5 inHg` 的“真空度”有时描述的是同一个状态。**本文是读表与器械安全知识，不是 FtM pumping 的压力处方。**

当人们讨论 vacuum pump（真空泵、负压泵）时，常会说“抽到 5”“表上显示 10”“不要超过某个数”。这些陈述缺少单位就无法复核。不同的压力表可能刻着 `inHg`、`mmHg`、`kPa`、`bar` 或 `psi`，还有的以负表压显示，有的以正数显示真空程度。把这些数字直接搬到另一台器械上，可能造成数量级上的误判。

![压力表读数和单位换算原创示意图；图中数字仅用于演算，不是推荐使用压力](/TransBioSci/images/pump/pressure-gauge-reading.svg)

*图 1｜原创读表示意：同一负压可按负表压或正值“真空度”表示；数值换算来自 [NIST 压力单位换算表](https://www.nist.gov/pml/owm/metric-si/unit-conversion/pressure-and-gas-flow-unit-conversions)。图中 `5` 仅为数学示例，**不是安全目标值**。图片源文件：[`assets/images/pressure-gauge-reading.svg`](/TransBioSci/images/pump/pressure-gauge-reading.svg)。*

## 1. 真空泵读的是哪种“压力”？

压力是单位面积承受的力，国际单位制用帕斯卡（Pa）表示。普通大气压约为 `101.325 kPa`（标准大气压的定义值），但实际环境气压随天气和海拔变化。[NIST-SI]

需要区分：

- **绝对压力（absolute pressure）**：以理想真空为零点。绝对压力通常不小于零。
- **表压（gauge pressure）**：相对于周围大气压的压力，公式是 `P表压 = P绝对 − P环境`。泵筒内部低于环境大气压时，表压为负数。
- **真空度 / 负压幅度（vacuum magnitude）**：一些面板把压差的大小显示为正值，例如表上刻 `5 inHg VAC`，可能表示比环境低约 5 inHg，而不是正表压 `+5 inHg`。

**举例**：假设某仪表测到 `−5 inHg` 表压，相对于大气约低 `16.93 kPa`；另一种真空表可把同样的压差标为 `5 inHg`。这两种刻度的方向可能完全不同。使用前必须先识别仪表刻度和产品说明，不能仅凭箭头的位置判断它“更安全”或“更危险”。

> 易误解点：**“负压更大”**在日常表达中可能意味着表压更负（例如 `−10 kPa` 比 `−5 kPa` 更低），但在正数真空刻度上则是数字更大。为避免歧义，最好总是写成“`−X kPa` 表压”或“`X inHg` 真空度”。

## 2. inHg、mmHg、kPa、psi 怎么换算？

| 单位 | 含义 | 换算关系（约值） |
|---|---|---|
| `inHg` | 英寸汞柱 | `1 inHg = 3.386389 kPa = 25.4 mmHg` |
| `mmHg` | 毫米汞柱 | `1 mmHg ≈ 0.133322 kPa` |
| `kPa` | 千帕 | `1 kPa = 1000 Pa` |
| `psi` | 磅力每平方英寸 | `1 psi ≈ 6.894757 kPa ≈ 2.03602 inHg` |

以上采用 NIST 列出的约定值。传统汞柱单位存在与参考温度有关的细分定义；一般器械读表可使用上述常规换算值。[NIST-CONV]

以下仅用于理解**单位差异**：

| 写法 | 对应压力幅度（约） |
|---|---:|
| `5 inHg` | `16.93 kPa` = `127 mmHg` = `2.46 psi` |
| `5 psi` | `34.47 kPa` = `10.18 inHg` = `258.6 mmHg` |
| `5 mmHg` | `0.667 kPa` = `0.197 inHg` |

因此，如果社区教程只写“5 pounds”，无法确认是 `5 psi`、某个表盘刻度、器械品牌的非标准标识，还是口语误用。**没有单位就没有可执行的换算**，不应该擅自补全。

## 3. 实际检查压力表的五个问题

1. **刻度的单位是什么？** 观察表盘或说明书是否明确写着 `inHg`、`mmHg`、`psi`、`kPa`，注意双单位刻度与内外圈。
2. **刻度是正数真空度还是负表压？** 带 `VAC` 的刻度与 `−kPa` 刻度可能采用不同方向。
3. **是否在正确的测量位置？** 管路、接头、漏气、止回阀和表的位置都可能影响读数能否代表泵筒内压差。
4. **表盘的量程和零点是否正常？** 量程过大时，小幅差异难读；指针不能回零、刻度不清或仪表损坏时，不应依赖读数。
5. **能否立即解除负压？** 释放阀属于重要安全设计，不能把缓慢漏气当作可靠的紧急释放方式。

压力表的单位准确，并不意味着这台仪器适合人体使用；一个有刻度的普通工业真空泵也不因此成为医疗器械。

## 4. FDA 的“17 inHg”到底是什么意思？

美国 FDA 2004 年关于 *External Penile Rigidity Devices*（外置阴茎勃起辅助装置）的指导文件，在**设备设计**章节提到，相关产品通常抽取小于 `17 inHg` 的真空度，并要求厂家验证装置最大真空水平、配置自动限压和手动快速释放机制。[FDA-2004]

这段信息经常被错误地转述为“人体可以安全承受 17 inHg”。两者在逻辑上不是一回事：

- **适用器械不同**：该 FDA 文件定义的目标用途是产生或维持足够的阴茎硬度以辅助性交。
- **目标用途不同**：该文件明确说明，阴茎增大、机械牵引等用途**不在这一设备类别的适用范围之内**。
- **研究人群不同**：文件没有给出适用于 FtM bottom growth pumping 的标准负压。
- **技术指标不等于操作目标**：设备上限、自动泄压阈值、使用者实际施加压力并非同一物理或医学概念。

同一 FDA 文件还强调，负压装置不应为长时间连续施加负压而设计，且过高负压可能造成淤血、点状出血和组织损伤。[FDA-2004] 这些是值得参考的风险信息，但不能转换为“照着某个数字操作就安全”。

## 5. 为什么不在这里给出 FtM 的标准压力和时长？

现有医学文献中，负压勃起辅助装置（vacuum erectile device，VED）的临床研究主要面向有阴茎的 ED 患者。国际性医学咨询组织（ICSM）在 2025 年发表的综述指出，这类装置对特定 ED 治疗有价值，但并不支持将其用于一般意义上的阴茎增长，其针对其他解剖结构的研究同样有限。[ICSM-2025]

2014 年有 97 名接受 metoidioplasty 的患者参与的病例系列报告了某外科团队术前并用 DHT 与真空装置的方案。[VUK-2014] 但该研究缺乏可以隔离 **pump 单独效果** 的对照，也不是安全压力和时长的随机比较试验。文中的方案不能直接变成普通用户的推荐参数。

因此，本文可以严谨回答“压力是多少、怎样读数、为什么不应把某些数字互相替代”，**尚不能严谨回答“FtM 使用多少 inHg 最安全、每天多少分钟能永久增长”**。

## 6. 常见问题

**Q：表盘写着 `0–30 inHg`，是不是到 30 都能用？** 不是。量程指仪表能显示的范围，既不是组织耐受范围，也不是器械经认证的安全区间。

**Q：压力有负号是不是坏了？** 不一定。负表压是正常计量方式。要核查说明书和零点，而不是把负号自动认定为故障。

**Q：我能把英文教程的 `5 lbs` 转换成 `5 psi` 吗？** 不能。`lb` 通常是质量或力的写法，`psi` 是压强单位；没有面积、表盘上下文和原始定义就不能直接转换。

**Q：一台表更精确，就代表使用更安全吗？** 不代表。准确计量有助于避免误读，却不能替代器械适配、快速泄压、组织观察和医学证据。

**Q：使用时出现疼痛或异常颜色，应该先把压力调低继续吗？** 不应该继续试探。应解除负压并停止使用；疼痛、明显出血或感觉下降应联系医疗专业人员，严重症状需尽快就医。[MEDLINE]

## 参考资料与证据位置

1. **[NIST-CONV]** 美国国家标准与技术研究院，*Pressure and Gas Flow Unit Conversions*。精确换算表：[NIST 原文](https://www.nist.gov/pml/owm/metric-si/unit-conversion/pressure-and-gas-flow-unit-conversions)。**证据用途**：单位定义和换算；不包含人体安全参数。
2. **[NIST-SI]** NIST，*Guide to the SI, Appendix B.9*：[原文](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9)。**证据用途**：标准换算因素。
3. **[FDA-2004]** FDA，*External Penile Rigidity Devices — Class II Special Controls Guidance*，2004-12-28：[原文（HTML）](https://www.fda.gov/medical-devices/guidance-documents-medical-devices-and-radiation-emitting-products/external-penile-rigidity-devices-class-ii-special-controls-guidance-document-industry-and-fda-staff)。重点核查 **Scope / Design Features / Labeling**。**证据用途**：器械类别、风险和设计；非 FtM 压力处方。
4. **[ICSM-2025]** Wang R, et al. *Vacuum erectile devices for erectile dysfunction: recommendations from the 5th international consultation on sexual medicine*. *Sexual Medicine Reviews*, 2025. DOI: [10.1093/sxmrev/qeaf002](https://doi.org/10.1093/sxmrev/qeaf002)；[PubMed](https://pubmed.ncbi.nlm.nih.gov/39957431/)。**证据用途**：对阴茎 ED 的临床证据与适用边界。
5. **[VUK-2014]** Vukadinovic V, et al. *The Role of Clitoral Anatomy in Female to Male Sex Reassignment Surgery*. *ScientificWorldJournal*, 2014. DOI: [10.1155/2014/437378](https://doi.org/10.1155/2014/437378)；[PMC 全文](https://pmc.ncbi.nlm.nih.gov/articles/PMC4005052/)。**证据用途**：FtM 手术病例系列中出现过真空装置使用，不证明单独永久增长效果。
6. **[MEDLINE]** MedlinePlus，*Vacuum erectile devices for erection problems*：[原文](https://medlineplus.gov/ency/patientinstructions/000985.htm)。**证据用途**：患者教育、不良反应和就医提示。

**继续阅读：** [Pump 后如何区分充血、水肿和损伤？](/TransBioSci/zh/trans/ftm/art-0007/) · [Pump 会导致 ED 吗？](/TransBioSci/zh/trans/ftm/art-0008/)

---

*本文是面向 FtM 读者的生理科学科普和资料整理，不替代个体医疗诊断。文中数字如无特别说明均为单位换算示例，不构成任何使用建议。*
