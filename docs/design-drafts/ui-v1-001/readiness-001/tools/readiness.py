"""Four stable command entry points. See README for external output/commit arguments."""
import subprocess,sys
from pathlib import Path
here=Path(__file__).parent
if len(sys.argv)<2:raise SystemExit('validate | test | build-review | verify-artifact')
mode=sys.argv[1];args=sys.argv[2:]
if mode=='validate':cmd=[sys.executable,'-B',str(here/'validate.py'),*args]
elif mode=='test':cmd=[sys.executable,'-B',str(here/'delivery.py'),'test',*args]
elif mode=='build-review':cmd=[sys.executable,'-B',str(here/'delivery.py'),'build',*args]
elif mode=='verify-artifact':cmd=[sys.executable,'-B',str(here/'delivery.py'),'verify',*args]
else:raise SystemExit('Unknown command')
raise SystemExit(subprocess.run(cmd).returncode)
