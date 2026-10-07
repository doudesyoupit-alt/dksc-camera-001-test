"""Deterministically generate the isolated candidate JSON Schema; stdlib only."""
import json
from pathlib import Path
VERSION='vdraw-drawing-ir/1.0.0-candidate.1'
def obj(props, optional=()):
    return {'type':'object','properties':props,'required':[k for k in props if k not in optional],'additionalProperties':False}
def enum(*v): return {'enum':list(v)}
def ref(v): return {'$ref':'#/$defs/'+v}
def arr(x,min=0,max=10000): return {'type':'array','items':x,'minItems':min,'maxItems':max}
s={'type':'string','minLength':1,'maxLength':1000}
id={'type':'string','minLength':1,'maxLength':256}
n={'type':'number'}
pos={'type':'number','exclusiveMinimum':0}
nonneg={'type':'number','minimum':0}
nullable={'type':['string','null'],'maxLength':256}
xy={'type':'array','items':n,'minItems':2,'maxItems':2}
hash={'type':'string','pattern':'^[a-f0-9]{64}$'}
unit=enum('PX','EMU','PT','MM','UNSCALED')
role=enum('SOURCE','LAYOUT','REAL_WORLD')
status=enum('KNOWN','UNCERTAIN','UNKNOWN','OCCLUDED','LOW_QUALITY','RETAKE_REQUIRED','MEASUREMENT_REQUIRED','HUMAN_CHECK_REQUIRED')
geom=[]
for kind,props in [('line',{'start':xy,'end':xy}),('polyline',{'points':arr(xy,2),'closed':{'type':'boolean'}}),('rect',{'origin':xy,'size':{'type':'array','items':pos,'minItems':2,'maxItems':2}}),('polygon',{'points':arr(xy,3),'closed':{'const':True}}),('circle',{'center':xy,'radius':pos}),('ellipse',{'center':xy,'radii':{'type':'array','items':pos,'minItems':2,'maxItems':2},'angleDeg':n}),('arc',{'center':xy,'radii':{'type':'array','items':pos,'minItems':2,'maxItems':2},'startDeg':n,'sweepDeg':n,'direction':enum('CW','CCW')}),('text',{'content':{'type':'string','maxLength':100000},'anchor':xy,'baseline':xy,'size':pos,'fontFamily':s,'lineBreaks':enum('PRESERVED'),'runs':arr(obj({'content':{'type':'string'},'styleId':nullable}))})]:
    geom.append(obj({'kind':{'const':kind},**props}))
d={
 'id':id,'sha256':hash,'point':xy,'unit':unit,'status':status,'geometry':{'oneOf':geom},
 'binding':obj({'sourceAssetId':id,'sha256':hash,'pageId':id,'nativeObjectId':id,'partPath':s}),
 'evidence':obj({'id':id,'sha256':hash,'uri':s,'method':s}),
 'asset':obj({'id':id,'sha256':hash,'mediaType':s,'sourceType':enum('PHOTO','PAPER','PDF','PPTX'),'immutableUri':s}),
 'page':obj({'id':id,'sourceAssetId':id,'index':{'type':'integer','minimum':0},'objectIds':arr(id),'inventoryIds':arr(id)}),
 'frame':obj({'id':id,'physicalUnit':unit,'unitRole':role,'origin':xy,'yAxis':enum('UP','DOWN'),'extent':{'type':'array','items':pos,'minItems':2,'maxItems':2},'pageId':nullable,'userUnit':pos},('userUnit',)),
 'calibration':obj({'id':id,'provenance':enum('USER_INPUT','KNOWN_OBJECT','DRAWING_DIMENSION','MARKER','SCALE','AR','MULTI_VIEW'),'scope':obj({'frameId':id,'objectIds':arr(id,1)}),'referenceBinding':ref('binding'),'evidenceIds':arr(id,1),'referenceValueMM':pos,'observedValue':pos,'observedValueUnit':unit,'mmPerSourceUnit':pos,'reviewedBy':s,'uncertaintyMM':nonneg}),
 'transform':obj({'id':id,'fromFrameId':id,'toFrameId':id,'type':enum('AFFINE','HOMOGRAPHY'),'matrix':{'type':'array','items':n,'minItems':9,'maxItems':9},'convention':{'const':'ROW_MAJOR_COLUMN_VECTOR'},'composition':{'const':'NEXT_TIMES_PREVIOUS'},'invertible':{'type':'boolean'},'provenance':obj({'method':s,'evidenceIds':arr(id,1)}),'validRegion':{'oneOf':[{'type':'null'},obj({'min':xy,'max':xy})]},'calibrationId':nullable}),
 'confidence':obj({'value':{'type':['number','null'],'minimum':0,'maximum':1},'method':s,'measurementStatus':enum('UNMEASURED','MEASURED','MODEL_SCORE')}),
 'rotation':obj({'value':n,'unit':{'const':'DEG'},'direction':enum('CW','CCW'),'pivot':xy}),
 'style':obj({'stroke':{'type':['string','null'],'pattern':'^#[A-Fa-f0-9]{6}$'},'fill':{'type':['string','null'],'pattern':'^#[A-Fa-f0-9]{6}$'},'width':nonneg,'widthUnit':unit,'dash':arr(nonneg),'opacity':{'type':'number','minimum':0,'maximum':1},'semanticColor':s,'evidenceIds':arr(id)}),
 'layer':obj({'id':id,'name':s,'provenance':enum('SOURCE','SYNTHETIC'),'evidenceIds':arr(id)}),
 'object':obj({'id':id,'kind':enum('line','polyline','rect','polygon','circle','ellipse','arc','text'),'sourceBinding':ref('binding'),'sourceFrameId':id,'frameId':id,'nativeGeometry':ref('geometry'),'nativeNumbers':arr(obj({'path':s,'lexeme':s,'value':n})),'drawingGeometry':ref('geometry'),'transformIds':arr(id),'layerId':id,'category':s,'rotation':ref('rotation'),'style':ref('style'),'confidence':ref('confidence'),'status':status,'relationshipIds':arr(id)}),
 'inventory':obj({'id':id,'sourceBinding':ref('binding'),'role':enum('CONTAINER','DRAWABLE_PART','BACKGROUND','HIDDEN','NON_DRAWABLE'),'parentId':nullable,'support':enum('SUPPORTED','UNSUPPORTED','HUMAN_CHECK_REQUIRED'),'reason':nullable,'nextHumanAction':nullable}),
 'sourceLedger':obj({'inventoryId':id,'disposition':enum('REPRESENTED','UNSUPPORTED','HUMAN_CHECK_REQUIRED','EXCLUDED_BY_POLICY'),'objectIds':arr(id),'reason':nullable,'nextHumanAction':nullable,'policyEvidenceId':nullable}),
 'relationship':obj({'id':id,'kind':enum('CONNECTED_TO','CONTAINS','INSIDE','ADJACENT_TO','ALIGNED_WITH'),'subjectId':id,'objectId':id,'status':status,'confidence':ref('confidence'),'evidenceIds':arr(id,1)}),
 'issue':obj({'id':id,'code':s,'inventoryId':nullable,'reason':s,'nextHumanAction':s,'evidenceIds':arr(id)}),
 'retention':obj({'inventoryId':id,'status':enum('EXPORTED','UNSUPPORTED','HUMAN_CHECK_REQUIRED','EXCLUDED_BY_POLICY'),'entityIds':arr(id),'reason':nullable,'nextHumanAction':nullable}),
 'export':obj({'id':id,'targetType':enum('PPTX','DXF','EDITOR_PROJECTION'),'targetFrameId':id,'unitRole':role,'requiredInventoryIds':arr(id),'readiness':enum('FULL','PARTIAL','BLOCKED'),'retentionLedger':arr(ref('retention')),'outputEntities':arr(obj({'id':id,'inventoryId':id,'objectId':id}))})
}
schema=obj({'schemaVersion':{'const':VERSION},'contractStatus':{'const':'CANDIDATE'},'documentId':id,'sourceType':enum('PHOTO','PAPER','PDF','PPTX'),'scaleStatus':enum('UNSCALED','CALIBRATED'),'sourceAssets':arr(ref('asset'),1),'pages':arr(ref('page'),1,100),'frames':arr(ref('frame'),1),'calibrations':arr(ref('calibration')),'transforms':arr(ref('transform')),'layers':arr(ref('layer'),1),'objects':arr(ref('object')),'sourceInventory':arr(ref('inventory')),'sourceLedger':arr(ref('sourceLedger')),'relationships':arr(ref('relationship')),'issues':arr(ref('issue')),'exportEvaluations':arr(ref('export')),'evidence':arr(ref('evidence'))})
schema={'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'urn:'+VERSION,'title':'VDRAW Drawing IR isolated candidate V1',**schema,'$defs':d}
Path(__file__).with_name('schema.json').write_text(json.dumps(schema,ensure_ascii=False,indent=2)+'\n')
