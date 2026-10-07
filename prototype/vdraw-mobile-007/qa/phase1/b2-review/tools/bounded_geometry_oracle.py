"""Independent native-EMU primitive truth; custom arbitrary path points excluded."""
import math

def expected(o,height_mm):
 x=o.get('xfrm');c=o.get('orderedCornersEMU');g=None;native=None
 if not x or not c:return {'representability':'UNSUPPORTED_NO_KNOWN_NATIVE_EMU_PRIMITIVE'}
 w=x.get('cx');h=x.get('cy')
 if o.get('customPaths'):return {'representability':'CUSTOM_PATH_COORDINATE_FRAME_UNREPRESENTABLE','rawCustomNativeUnit':'PATH_COORDINATE'}
 if o['preset']=='line':native={'kind':'line','start':[0,0],'end':[w,h]};g={'kind':'line','start':[c[0][0]/36000,height_mm-c[0][1]/36000],'end':[c[2][0]/36000,height_mm-c[2][1]/36000]}
 elif o['preset']=='rect':native={'kind':'polygon','points':[[0,0],[w,0],[w,h],[0,h]],'closed':True};g={'kind':'polygon','points':[[p[0]/36000,height_mm-p[1]/36000] for p in c],'closed':True}
 elif o['preset']=='ellipse':
  center=[(c[0][i]+c[2][i])/2 for i in range(2)];axes=o['basisEMU'];a,b=[[v/2 for v in p] for p in axes];r=[math.hypot(*a),math.hypot(*b)];dot=sum(v*z for v,z in zip(a,b));similar=abs(math.hypot(*axes[0])/w-math.hypot(*axes[1])/h)<=1e-12
  if not similar or abs(dot)>1e-8:return {'representability':'UNSUPPORTED_ELLIPSE_NONSIMILARITY_OR_SKEW'}
  circle=w==h;native={'kind':'circle','center':[w/2,h/2],'radius':w/2} if circle else {'kind':'ellipse','center':[w/2,h/2],'radii':[w/2,h/2],'angleDeg':0}
  g={'kind':'circle','center':[center[0]/36000,height_mm-center[1]/36000],'radius':r[0]/36000} if circle else {'kind':'ellipse','center':[center[0]/36000,height_mm-center[1]/36000],'radii':[v/36000 for v in r],'angleDeg':math.atan2(-a[1],a[0])*180/math.pi}
 else:return {'representability':'UNSUPPORTED_PRESET_OR_GEOMETRY'}
 return {'representability':'KNOWN_NATIVE_EMU_PRIMITIVE_NUMERICS_ONLY','nativeGeometry':native,'drawingGeometry':g,'sourceUnit':'EMU','drawingUnit':'MM','unitRole':'LAYOUT','yAxis':'UP','scaleStatus':'UNSCALED','notAppearanceAcceptance':True}
