"""G original-property checker v2: original equal-paint-alpha alternatives; frozen v1 preserved."""
def evaluate(t,claims):
 checks=[]
 def check(p,e,a):checks.append({'path':p,'expected':e,'actual':a,'status':'PASS' if e==a else 'FAIL'})
 original={o['sourceKey']:o for o in t['objects']};seen=[]
 for c in claims:
  key=c.get('sourceKey');seen.append(key);o=original.get(key);check(str(key)+'.originalSourceExists',True,o is not None)
  if not o:continue
  check(key+'.sourceHash',t['sourceHash'],c.get('sourceHash'))
  if not o['customPaths']:
   check(key+'.resolutionFields',sorted(o['properties']),sorted(c['resolution']))
  for f,r in c.get('resolution',{}).items():
   e=o['properties'].get(f);check(key+'.'+f+'.fieldKnown',True,e is not None)
   if not e:continue
   if r.get('state')=='EXPLICIT':
    check(key+'.'+f+'.state','EXPLICIT',e['state']);check(key+'.'+f+'.value',e['value'],c.get('values',{}).get(f));check(key+'.'+f+'.rawLexeme',e['rawLexeme'],r.get('rawLexeme'));check(key+'.'+f+'.encoding',e['encoding'],r.get('encoding'));allowed=[p['sourcePropertyPath'] for p in e.get('allPaintAlphas',[]) if p['rawLexeme']==e['rawLexeme'] and p['value']==e['value']] if f=='opacity' and e['state']=='EXPLICIT' else [e['sourcePropertyPath']];check(key+'.'+f+'.sourcePropertyPathOriginal',True,r.get('propertyPath') in allowed)
   elif r.get('state')=='NOT_APPLICABLE':check(key+'.'+f+'.state','NOT_APPLICABLE',e['state']);check(key+'.'+f+'.value',None,c.get('values',{}).get(f))
   elif r.get('state')=='UNRESOLVED':check(key+'.'+f+'.originalState','UNRESOLVED',e['state']);check(key+'.'+f+'.value',None,c.get('values',{}).get(f));check(key+'.'+f+'.rawLexeme',None,r.get('rawLexeme'));check(key+'.'+f+'.reasonPresent',True,bool(r.get('reason')))
   else:check(key+'.'+f+'.noDefault',True,False)
  if o['customPaths']:
   check(key+'.arbitraryCustomNativeUnit','PATH_COORDINATE',c.get('sourceCoordinateUnit'));check(key+'.customNotDrawable',False,c.get('represented'));check(key+'.customExplicitLedger','CUSTOM_PATH_COORDINATE_FRAME_UNREPRESENTABLE',c.get('ledgerReason'));check(key+'.customRawDimensions',[p['pathExtent'] for p in o['customPaths']],c.get('rawPathExtents'));check(key+'.customRawVertices',[p['rawVertices'] for p in o['customPaths']],c.get('rawPathVertices'))
 check('claimIdentity.unique',len(seen),len(set(seen)))
 return {'schema':'vdraw-G-B2-original-property-claim-comparison/2','checks':checks,'pass':sum(c['status']=='PASS' for c in checks),'fail':sum(c['status']=='FAIL' for c in checks),'productGate':'HOLD','scope':'ORIGINAL_XML_PROPERTY_AND_CUSTOM_UNIT_ONLY'}
