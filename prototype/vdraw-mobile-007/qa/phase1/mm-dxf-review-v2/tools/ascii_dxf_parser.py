"""G independent bounded ASCII DXF parser, no writer imports, no actual-app claims."""
import re,math,hashlib
class DXFError(ValueError):pass
def parse(data):
 if isinstance(data,str):data=data.encode('ascii')
 try:text=data.decode('ascii')
 except UnicodeDecodeError:raise DXFError('NON_ASCII')
 if '\0' in text:raise DXFError('NUL')
 lines=text.splitlines()
 if len(lines)%2:raise DXFError('ODD_GROUP_PAIR_LINES')
 pairs=[]
 for i in range(0,len(lines),2):
  if not re.fullmatch(r'\s*[0-9]+\s*',lines[i]):raise DXFError('GROUP_CODE_NOT_INTEGER')
  code=int(lines[i]);value=lines[i+1].strip()
  if not 0<=code<=1071:raise DXFError('GROUP_CODE_OUT_OF_RANGE')
  pairs.append((code,value))
 sections={};order=[];ix=0
 while ix<len(pairs):
  if pairs[ix]==(0,'EOF'):
   if ix!=len(pairs)-1:raise DXFError('TRAILING_AFTER_EOF')
   break
  if pairs[ix]!=(0,'SECTION') or ix+1>=len(pairs) or pairs[ix+1][0]!=2:raise DXFError('SECTION_STRUCTURE')
  name=pairs[ix+1][1]
  if name in sections:raise DXFError('DUPLICATE_SECTION')
  ix+=2;block=[]
  while ix<len(pairs) and pairs[ix]!=(0,'ENDSEC'):block.append(pairs[ix]);ix+=1
  if ix==len(pairs):raise DXFError('MISSING_ENDSEC')
  sections[name]=block;order.append(name);ix+=1
 else:raise DXFError('MISSING_EOF')
 if order not in [['HEADER','TABLES','ENTITIES'],['HEADER','TABLES','BLOCKS','ENTITIES']]:raise DXFError('BOUNDED_SECTION_ORDER')
 if sections.get('BLOCKS'):raise DXFError('NONEMPTY_BLOCKS_NOT_QUALIFIED')
 header={};name=None
 for c,v in sections['HEADER']:
  if c==999:continue
  if c==9:
   if v in header:raise DXFError('DUPLICATE_HEADER_VARIABLE')
   name=v;header[v]=[]
  elif name is None:raise DXFError('HEADER_VARIABLE_REQUIRED')
  else:header[name].append((c,v))
 if header.get('$ACADVER')!=[(1,'AC1009')]:raise DXFError('VERSION_NOT_AC1009')
 if set(header)!={'$ACADVER'}:raise DXFError('HEADER_VARIABLE_OUTSIDE_BOUNDED_DIALECT')
 def records(ps):
  out=[]
  for code,value in ps:
   if code==999:continue
   if code==0:out.append({'type':value,'pairs':[]})
   elif not out:raise DXFError('RECORD_MARKER_REQUIRED')
   else:out[-1]['pairs'].append((code,value))
  return out
 rs=records(sections['ENTITIES']);seen=[]
 def one(r,code,default=None):
  vs=[v for c,v in r['pairs'] if c==code]
  if len(vs)>1 or not vs and default is None:raise DXFError('MISSING_OR_DUPLICATE_CODE_'+str(code))
  return vs[0] if vs else default
 def num(r,c,default=None):
  try:n=float(one(r,c,default))
  except (ValueError,TypeError):raise DXFError('NOT_NUMERIC_'+str(c))
  if not math.isfinite(n):raise DXFError('NONFINITE')
  return n
 def point(r,x=10,y=20,z=30):
  if num(r,z,'0')!=0:raise DXFError('NONZERO_Z')
  return [num(r,x),num(r,y)]
 for r in rs:
  if r['type'] not in ['LINE','CIRCLE','POLYLINE','VERTEX','SEQEND']:raise DXFError('UNSUPPORTED_ENTITY_TYPE')
  r['handle']=one(r,5);r['layer']=one(r,8)
  if not re.fullmatch('[0-9A-Fa-f]+',r['handle']):raise DXFError('BAD_HANDLE')
  if r['handle'].upper() in seen:raise DXFError('DUPLICATE_HANDLE')
  seen.append(r['handle'].upper())
  if any(c in [100,330,420,440] for c,v in r['pairs']):raise DXFError('NEWER_ENTITY_TAG_NOT_QUALIFIED')
 logical=[];i=0
 while i<len(rs):
  r=rs[i];kind=r['type']
  if kind=='LINE':g={'kind':'line','start':point(r),'end':point(r,11,21,31)};raw=[r];i+=1
  elif kind=='CIRCLE':g={'kind':'circle','center':point(r),'radius':num(r,40)};raw=[r];i+=1
  elif kind=='POLYLINE':
   if int(num(r,70,'0')) not in [0,1]:raise DXFError('UNSUPPORTED_POLYLINE_FLAGS')
   if num(r,66,'1')!=1:raise DXFError('VERTICES_FOLLOW_REQUIRED')
   if point(r)!=[0,0]:raise DXFError('POLYLINE_DUMMY_ORIGIN')
   raw=[r];pts=[];i+=1
   while i<len(rs) and rs[i]['type']=='VERTEX':
    v=rs[i]
    if int(num(v,70,'0'))!=0 or num(v,42,'0')!=0:raise DXFError('VERTEX_CURVE_OR_FLAGS')
    if v['layer']!=r['layer']:raise DXFError('POLYLINE_LAYER_MISMATCH')
    pts.append(point(v));raw.append(v);i+=1
   if len(pts)<2 or i>=len(rs) or rs[i]['type']!='SEQEND':raise DXFError('POLYLINE_VERTEX_OR_SEQEND_MISSING')
   if rs[i]['layer']!=r['layer']:raise DXFError('SEQEND_LAYER_MISMATCH')
   raw.append(rs[i]);i+=1;g={'kind':'polygon' if int(num(r,70,'0'))&1 else 'polyline','points':pts,'closed':bool(int(num(r,70,'0'))&1)}
  else:raise DXFError('ORPHAN_VERTEX_OR_SEQEND')
  if kind=='CIRCLE' and g['radius']<=0:raise DXFError('NONPOSITIVE_RADIUS')
  logical.append({'type':kind,'handle':r['handle'],'layer':r['layer'],'geometry':g,'rawHandles':[q['handle'] for q in raw],'rawTypes':[q['type'] for q in raw]})
 return {'schema':'vdraw-G-independent-bounded-ASCII-DXF-parse/2','sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'pairs':len(pairs),'sectionOrder':order,'header':header,'comments':[v for c,v in pairs if c==999],'tables':records(sections['TABLES']),'logicalEntities':logical,'rawEntityRecords':rs,'logicalEntityCount':len(logical),'rawEntityRecordCount':len(rs),'coordinateUnit':'UNSPECIFIED_IN_DXF_BYTES','compatibility':'NOT_PROVEN_FROM_VERSION_TAG','productGate':'HOLD'}
